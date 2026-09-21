(function () {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  let calendarUrl = "";

  function fail(message) {
    $("#loading").hidden = true;
    $("#result").hidden = true;
    $("#error").textContent = message;
    $("#error").hidden = false;
  }

  function readPayload() {
    const params = new URLSearchParams(location.hash.slice(1));
    const encoded = params.get("d");
    if (!encoded) throw new Error("这个二维码里没有找到课表。请回到电脑重新生成一次。 ");
    return MobilePayload.decode(encoded);
  }

  try {
    const payload = readPayload();
    const courses = MobilePayload.toCourses(payload, ScheduleCore.parseWeekSpec);
    const calendar = ScheduleCore.buildIcs(courses, {
      firstMonday: payload.m,
      reminderMinutes: payload.r,
      calendarName: payload.n
    });
    if (!calendar.eventCount) throw new Error("课表中没有可导入的日程。 ");

    calendarUrl = URL.createObjectURL(new Blob([calendar.content], { type: "text/calendar;charset=utf-8" }));
    $("#courseCount").textContent = `${courses.length} 门`;
    $("#eventCount").textContent = `${calendar.eventCount} 个`;
    $("#calendarName").textContent = payload.n;
    $("#firstMonday").textContent = payload.m;
    $("#reminder").textContent = payload.r ? `${payload.r} 分钟` : "上课时";
    $("#loading").hidden = true;
    $("#result").hidden = false;
  } catch (error) {
    fail(error.message || "二维码解析失败，请回到电脑重新生成。 ");
  }

  $("#importButton").addEventListener("click", () => {
    if (!calendarUrl) return;
    const link = document.createElement("a");
    link.href = calendarUrl;
    link.target = "_blank";
    link.download = `华师大课表-${$("#firstMonday").textContent}.ics`;
    document.body.append(link);
    link.click();
    link.remove();
  });

  addEventListener("pagehide", () => {
    if (calendarUrl) URL.revokeObjectURL(calendarUrl);
  });
})();
