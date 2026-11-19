(function () {
  "use strict";

  var cfg = window.TERMWEB;
  var status = document.getElementById("release-status");
  var anchors = document.querySelectorAll("[data-download]");

  function say(text) {
    if (status) {
      status.textContent = text;
    }
  }

  function isGithub(url) {
    return typeof url === "string" && url.indexOf("https://github.com/") === 0;
  }

  function formatSize(bytes) {
    return (bytes / 1048576).toFixed(1) + " MB";
  }

  function findAsset(assets, predicate) {
    for (var i = 0; i < assets.length; i += 1) {
      var item = assets[i];
      if (item && typeof item.name === "string" && isGithub(item.browser_download_url) && predicate(item.name)) {
        return item;
      }
    }
    return null;
  }

  function apply(release) {
    var assets = Array.isArray(release.assets) ? release.assets : [];
    var found = 0;

    anchors.forEach(function (anchor) {
      var label = anchor.getAttribute("data-download");
      var meta = document.querySelector('[data-meta="' + label + '"]');
      var asset = findAsset(assets, function (name) {
        return name.indexOf(label + "-") === 0 && /\.apk$/.test(name);
      });
      if (!asset) {
        if (meta) {
          meta.textContent = "Not in the latest release";
        }
        return;
      }
      anchor.href = asset.browser_download_url;
      if (meta) {
        meta.textContent = String(release.tag_name) + " \u00b7 " + formatSize(Number(asset.size) || 0);
      }
      found += 1;
    });

    var sums = findAsset(assets, function (name) {
      return name === "SHA256SUMS";
    });
    var link = document.getElementById("checksums");
    if (link && sums) {
      link.href = sums.browser_download_url;
      link.hidden = false;
    }

    say(found > 0
      ? "Latest release: " + String(release.tag_name)
      : "The latest release does not contain any APK files yet.");
  }

  var url = "https://api.github.com/repos/" + cfg.org + "/" + cfg.appRepo + "/releases/latest";
  var controller = new AbortController();
  var timer = setTimeout(function () {
    controller.abort();
  }, 10000);

  say("Loading the latest release...");
  fetch(url, {
    headers: { Accept: "application/vnd.github+json" },
    signal: controller.signal
  })
    .then(function (response) {
      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }
      return response.json();
    })
    .then(apply)
    .catch(function () {
      say("Could not load the latest release. The buttons open the Releases page instead.");
    })
    .finally(function () {
      clearTimeout(timer);
    });
})();