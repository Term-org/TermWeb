(function () {
  "use strict";

  var cfg = window.TERMWEB;
  var LIMIT = 300;
  var cache = {};
  var state = { repo: "tp", arch: "aarch64", entries: [] };
  var request = 0;
  var searchTimer = null;

  var list = document.getElementById("package-list");
  var count = document.getElementById("package-count");
  var status = document.getElementById("package-status");
  var retry = document.getElementById("package-retry");
  var search = document.getElementById("package-search");
  var arch = document.getElementById("package-arch");
  var note = document.getElementById("repo-note");
  var buttons = document.querySelectorAll("[data-repo]");

  var NOTES = {
    tp: "The main repository is configured in every installation. Run tn update to refresh it.",
    tcp: "Community packages come from third-party recipes. Run tn community enable once, then tn update."
  };

  function indexUrl() {
    return cfg.repos[state.repo].base + "/" + cfg.referenceApp +
      "/dists/stable/main/binary-" + state.arch + "/Packages";
  }

  function formatKib(kib) {
    if (kib < 1024) {
      return kib + " KiB";
    }
    return (kib / 1024).toFixed(1) + " MiB";
  }

  function parse(text) {
    var entries = [];
    text.split(/\n\s*\n/).forEach(function (block) {
      var fields = {};
      block.split("\n").forEach(function (line) {
        if (!line || line[0] === " " || line[0] === "\t") {
          return;
        }
        var index = line.indexOf(":");
        if (index > 0) {
          fields[line.slice(0, index)] = line.slice(index + 1).trim();
        }
      });
      if (fields.Package) {
        entries.push({
          name: fields.Package,
          version: fields.Version || "",
          description: fields.Description || "",
          size: parseInt(fields["Installed-Size"], 10) || 0
        });
      }
    });
    entries.sort(function (a, b) {
      return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
    });
    return entries;
  }

  function setStatus(text, canRetry) {
    status.textContent = text;
    retry.hidden = !canRetry;
  }

  function render() {
    var term = search.value.trim().toLowerCase();
    var matches = state.entries.filter(function (entry) {
      return !term ||
        entry.name.toLowerCase().indexOf(term) !== -1 ||
        entry.description.toLowerCase().indexOf(term) !== -1;
    });

    var fragment = document.createDocumentFragment();
    matches.slice(0, LIMIT).forEach(function (entry) {
      var item = document.createElement("li");
      item.className = "package";

      var head = document.createElement("div");
      head.className = "package-head";
      var name = document.createElement("strong");
      name.textContent = entry.name;
      var version = document.createElement("span");
      version.className = "muted";
      version.textContent = entry.version + (entry.size ? " \u00b7 " + formatKib(entry.size) : "");
      head.append(name, version);

      var description = document.createElement("p");
      description.textContent = entry.description;

      var command = document.createElement("code");
      command.textContent = "tn install " + entry.name;

      item.append(head, description, command);
      fragment.appendChild(item);
    });

    list.textContent = "";
    list.appendChild(fragment);
    count.textContent = matches.length + " of " + state.entries.length + " packages" +
      (matches.length > LIMIT ? " (showing the first " + LIMIT + ")" : "");
  }

  function load() {
    var key = state.repo + "/" + state.arch;
    var id = ++request;
    note.textContent = NOTES[state.repo];
    list.textContent = "";
    count.textContent = "";

    if (cache[key]) {
      state.entries = cache[key];
      setStatus("", false);
      render();
      return;
    }

    setStatus("Loading the package list...", false);
    var controller = new AbortController();
    var timer = setTimeout(function () {
      controller.abort();
    }, 20000);

    fetch(indexUrl(), { signal: controller.signal })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("HTTP " + response.status);
        }
        return response.text();
      })
      .then(function (text) {
        if (id !== request) {
          return;
        }
        cache[key] = parse(text);
        state.entries = cache[key];
        setStatus("", false);
        render();
      })
      .catch(function (error) {
        if (id !== request) {
          return;
        }
        var reason = error && error.message ? error.message : "network error";
        setStatus("Unable to load the package list (" + reason + "). The repository may not be published yet.", true);
      })
      .finally(function () {
        clearTimeout(timer);
      });
  }

  buttons.forEach(function (button) {
    button.addEventListener("click", function () {
      state.repo = button.getAttribute("data-repo");
      buttons.forEach(function (other) {
        other.setAttribute("aria-pressed", other === button ? "true" : "false");
      });
      load();
    });
  });

  arch.addEventListener("change", function () {
    state.arch = arch.value;
    load();
  });

  search.addEventListener("input", function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(render, 120);
  });

  retry.addEventListener("click", load);

  load();
})();