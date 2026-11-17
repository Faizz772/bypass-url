"use strict";

(function () {
  var form = document.getElementById("buka");
  var input = document.getElementById("urlInput");
  var submitBtn = document.getElementById("submitBtn");
  var errorEl = document.getElementById("urlError");
  var detectedEl = document.getElementById("detected");
  var retryBtn = document.getElementById("retryBtn");
  var copyBtn = document.getElementById("copyBtn");

  var states = {
    empty: document.getElementById("stateEmpty"),
    loading: document.getElementById("stateLoading"),
    error: document.getElementById("stateError"),
    done: document.getElementById("stateDone"),
  };

  var result = document.getElementById("result");
  var stepsTime = document.getElementById("stepsTime");
  var stepItems = Array.prototype.slice.call(document.querySelectorAll("#stepsList li"));
  var traceWrap = document.getElementById("traceWrap");
  var traceList = document.getElementById("traceList");

  var lastUrl = "";
  var startedAt = 0;
  var busy = false;
  var timer = null;
  var ticker = null;

  var ENGINES = [
    { id: "mgvt", label: "safelink", test: /(^|\.)sfl\.gl$/i, endpoint: "/api/mgvt" },
    { id: "umpc", label: "bicolink", test: /(^|\.)bicolink\.com$/i, endpoint: "/api/umpc" },
  ];

  function detect(raw) {
    var u;
    try {
      u = new URL(raw.indexOf("://") === -1 ? "https://" + raw : raw);
    } catch (e) {
      return null;
    }
    if (!/^https?:$/.test(u.protocol)) return null;
    return ENGINES.find(function (e) {
      return e.test.test(u.hostname);
    }) || null;
  }

  function normalize(raw) {
    var t = raw.trim();
    if (!t) return "";
    return t.indexOf("://") === -1 ? "https://" + t : t;
  }

  function show(name) {
    Object.keys(states).forEach(function (k) {
      states[k].hidden = k !== name;
    });
    result.setAttribute("aria-busy", name === "loading" ? "true" : "false");
  }

  function setFieldError(msg) {
    if (msg) {
      errorEl.textContent = msg;
      errorEl.hidden = false;
      input.setAttribute("aria-invalid", "true");
    } else {
      errorEl.textContent = "";
      errorEl.hidden = true;
      input.removeAttribute("aria-invalid");
    }
  }

  function elapsedText() {
    return Math.round((Date.now() - startedAt) / 1000) + "s";
  }

  function startClock() {
    startedAt = Date.now();
    stopClock();
    ticker = setInterval(function () {
      stepsTime.textContent = Math.floor((Date.now() - startedAt) / 1000) + "s";
    }, 250);
  }

  function stopClock() {
    if (ticker) {
      clearInterval(ticker);
      ticker = null;
    }
  }

  function setSteps(activeIndex) {
    stepItems.forEach(function (li, i) {
      li.dataset.state = i < activeIndex ? "done" : i === activeIndex ? "active" : "";
    });
  }

  function advanceSteps() {
    var order = [1, 2, 3, 4];
    var i = 0;
    setSteps(0);
    timer = setInterval(function () {
      i = Math.min(i + 1, order.length - 1);
      setSteps(i);
    }, 4200);
  }

  function stopSteps() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function renderDone(data, source) {
    var link = document.getElementById("doneLink");
    link.textContent = data.bypassed_url;
    link.href = data.bypassed_url;

    var open = document.getElementById("openBtn");
    open.href = data.bypassed_url;

    document.getElementById("doneHost").textContent = data.host || "-";
    document.getElementById("doneEngine").textContent =
      source === "safelinku" ? "safelink (sfl.gl)" : source === "bicolink" ? "bicolink" : source || "-";
    var elapsed = Math.round((Date.now() - startedAt) / 1000);
    document.getElementById("doneTime").textContent = elapsed < 1 ? "<1s" : elapsed + "s";

    var steps = (data.steps || []).filter(Boolean);
    if (steps.length) {
      traceList.textContent = steps.join("\n");
      traceWrap.hidden = false;
    } else {
      traceWrap.hidden = true;
    }
    show("done");
  }

  function renderError(payload) {
    document.getElementById("errorText").textContent =
      payload.error || "Server tidak mengembalikan alasan. Coba lagi sebentar lagi.";

    var rawText = payload.raw ? String(payload.raw) : "";
    var trace = (payload.trace || []).join("\n");
    var combined = [rawText, trace].filter(Boolean).join("\n\n");

    if (combined) {
      document.getElementById("errorRaw").textContent = combined;
      document.getElementById("errorRawWrap").hidden = false;
    } else {
      document.getElementById("errorRawWrap").hidden = true;
    }
    show("error");
  }

  async function run(url) {
    var engine = detect(url);
    if (!engine) {
      setFieldError("Domain belum didukung. Yang bisa dipakai: sfl.gl dan bicolink.com.");
      show("empty");
      return;
    }

    lastUrl = url;
    startedAt = Date.now();
    setFieldError("");
    busy = true;
    submitBtn.disabled = true;
    submitBtn.textContent = "Memproses...";
    show("loading");
    startClock();
    advanceSteps();

    try {
      var res = await fetch(engine.endpoint + "?url=" + encodeURIComponent(url), {
        headers: { Accept: "application/json" },
      });

      var payload = null;
      try {
        payload = await res.json();
      } catch (e) {
        payload = { status: false, error: "Respons server tidak bisa dibaca (HTTP " + res.status + ")." };
      }

      if (res.ok && payload && payload.status && payload.data) {
        setSteps(stepItems.length);
        renderDone(payload.data, payload.source);
      } else {
        renderError(payload || {});
      }
    } catch (e) {
      renderError({ error: "Tidak bisa menghubungi server: " + e.message });
    } finally {
      stopClock();
      stopSteps();
      busy = false;
      submitBtn.disabled = false;
      submitBtn.textContent = "Buka link";
    }
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (busy) return;

    var url = normalize(input.value);
    if (!url) {
      setFieldError("Isi dulu link yang mau dibuka.");
      input.focus();
      show("empty");
      return;
    }
    if (!detect(url)) {
      setFieldError("Domain belum didukung. Yang bisa dipakai: sfl.gl dan bicolink.com.");
      input.focus();
      show("empty");
      return;
    }
    run(url);
  });

  input.addEventListener("input", function () {
    setFieldError("");
    var url = normalize(input.value);
    var engine = url ? detect(url) : null;
    if (engine) {
      detectedEl.textContent = "engine: " + engine.label;
      detectedEl.hidden = false;
    } else {
      detectedEl.hidden = true;
    }
  });

  document.querySelectorAll("[data-example]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      input.value = btn.getAttribute("data-example");
      input.dispatchEvent(new Event("input"));
      input.focus();
    });
  });

  retryBtn.addEventListener("click", function () {
    if (lastUrl) run(lastUrl);
  });

  copyBtn.addEventListener("click", async function () {
    var link = document.getElementById("doneLink");
    var original = copyBtn.textContent;
    try {
      await navigator.clipboard.writeText(link.href);
      copyBtn.textContent = "Tersalin";
    } catch (e) {
      var range = document.createRange();
      range.selectNodeContents(link);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      copyBtn.textContent = "Tekan Ctrl+C";
    }
    setTimeout(function () {
      copyBtn.textContent = original;
    }, 2000);
  });

  // Tema: default mengikuti sistem sampai pengguna memilih sendiri.
  var toggle = document.getElementById("themeToggle");
  toggle.addEventListener("click", function () {
    var root = document.documentElement;
    var current =
      root.dataset.theme ||
      (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    var next = current === "light" ? "dark" : "light";
    root.dataset.theme = next;
    try {
      localStorage.setItem("bypassurl-theme", next);
    } catch (e) {}
  });

  show("empty");
})();
