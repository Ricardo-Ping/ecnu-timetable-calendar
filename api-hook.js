(function () {
  "use strict";

  if (globalThis.__ECNU_TIMETABLE_API_HOOK__) return;
  globalThis.__ECNU_TIMETABLE_API_HOOK__ = true;

  const ATTRIBUTE = "data-ecnu-timetable-api";

  function compact(data) {
    if (!data || !Array.isArray(data.lessons) || !Array.isArray(data.weekIndices)) return null;
    return {
      currentWeek: data.currentWeek,
      weekIndices: data.weekIndices,
      lessons: data.lessons.map((lesson) => ({
        id: lesson.id,
        code: lesson.code,
        nameZh: lesson.nameZh,
        course: { nameZh: lesson.course?.nameZh || "" },
        semester: { startDate: lesson.semester?.startDate || "" },
        scheduleText: {
          dateTimePlaceText: {
            textZh: lesson.scheduleText?.dateTimePlaceText?.textZh || ""
          }
        }
      }))
    };
  }

  function capture(data) {
    try {
      const value = compact(data);
      if (!value || !document.documentElement) return;
      document.documentElement.setAttribute(ATTRIBUTE, JSON.stringify(value));
      document.dispatchEvent(new Event("ecnu-timetable-api-ready"));
    } catch (_error) {
      // A malformed or unrelated response is ignored.
    }
  }

  const originalFetch = globalThis.fetch;
  if (typeof originalFetch === "function") {
    globalThis.fetch = async function (...args) {
      const response = await originalFetch.apply(this, args);
      response.clone().json().then(capture).catch(() => {});
      return response;
    };
  }

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (...args) {
    this.__ecnuTimetableMethod = args[0];
    return originalOpen.apply(this, args);
  };
  XMLHttpRequest.prototype.send = function (...args) {
    this.addEventListener("load", function () {
      try {
        if (!this.responseType || this.responseType === "text") capture(JSON.parse(this.responseText));
        else if (this.responseType === "json") capture(this.response);
      } catch (_error) {
        // Non-JSON responses are unrelated to the timetable.
      }
    }, { once: true });
    return originalSend.apply(this, args);
  };
})();
