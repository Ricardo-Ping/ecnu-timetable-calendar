(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.ScheduleCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const DEFAULT_PERIODS = {
    1: ["08:00", "08:45"],
    2: ["08:50", "09:35"],
    3: ["09:50", "10:35"],
    4: ["10:40", "11:25"],
    5: ["11:30", "12:15"],
    6: ["13:00", "13:45"],
    7: ["13:50", "14:35"],
    8: ["14:50", "15:35"],
    9: ["15:40", "16:25"],
    10: ["16:30", "17:15"],
    11: ["18:00", "18:45"],
    12: ["18:50", "19:35"],
    13: ["19:40", "20:25"],
    14: ["20:30", "21:15"]
  };

  const CAMPUS_GEO = {
    putuo: { latitude: "31.227938", longitude: "121.404680", radius: 500 },
    minhang: { latitude: "31.032910", longitude: "121.449530", radius: 800 }
  };

  // WGS 84 building centers. Keep the campus coordinates above as a fallback
  // for new or unrecognised room names.
  const BUILDING_GEO = [
    { pattern: /二附中实验楼/, latitude: "31.224052", longitude: "121.399648", radius: 40 },
    { pattern: /田家炳(?:教育书院|楼)/, latitude: "31.232862", longitude: "121.402135", radius: 40 },
    { pattern: /干训楼/, latitude: "31.231929", longitude: "121.401502", radius: 40 },
    { pattern: /文史楼/, latitude: "31.230611", longitude: "121.404023", radius: 40 },
    { pattern: /文附楼/, latitude: "31.228494", longitude: "121.403977", radius: 40 },
    { pattern: /小教楼/, latitude: "31.228443", longitude: "121.402722", radius: 40 },
    { pattern: /科学会堂/, latitude: "31.228607", longitude: "121.401992", radius: 40 },
    { pattern: /文科大楼/, latitude: "31.228737", longitude: "121.403770", radius: 40 },
    { pattern: /软件学院/, latitude: "31.228279", longitude: "121.400771", radius: 40 },
    { pattern: /计算机楼/, latitude: "31.227886", longitude: "121.400495", radius: 40 },
    { pattern: /理科大楼/, latitude: "31.229445", longitude: "121.398820", radius: 40 },
    { pattern: /(?:教育部)?中学校长培训中心/, latitude: "31.227971", longitude: "121.402142", radius: 40 }
  ];

  function normalizeText(value) {
    return String(value || "")
      .replace(/\u00a0/g, " ")
      .replace(/[（]/g, "(")
      .replace(/[）]/g, ")")
      .replace(/[～—－至]/g, "~")
      .replace(/，/g, ",")
      .replace(/[ \t]+/g, " ")
      .replace(/\s*\n\s*/g, "\n")
      .trim();
  }

  function parseWeekSpec(spec) {
    const weeks = [];
    const value = normalizeText(spec).replace(/第/g, "");
    for (const token of value.split(/[,、]/)) {
      let parity = null;
      if (/单/.test(token)) parity = 1;
      if (/双/.test(token)) parity = 0;
      const part = token.replace(/[()周单双]/g, "").trim();
      if (!part) continue;
      const range = part.match(/^(\d{1,2})\s*[~-]\s*(\d{1,2})$/);
      if (range) {
        const start = Number(range[1]);
        const end = Number(range[2]);
        for (let week = start; week <= end && week <= 30; week += 1) {
          if (parity === null || week % 2 === parity) weeks.push(week);
        }
      } else if (/^\d{1,2}$/.test(part)) {
        const week = Number(part);
        if (parity === null || week % 2 === parity) weeks.push(week);
      }
    }
    return [...new Set(weeks)]
      .filter((week) => week > 0)
      .sort((a, b) => a - b);
  }

  function parseApiTimetable(data) {
    if (!data || !Array.isArray(data.lessons)) return null;
    const dayMap = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 7, 天: 7 };
    const courses = [];
    const seen = new Set();
    let firstMonday = "";

    for (const lesson of data.lessons) {
      if (!firstMonday && lesson.semester?.startDate) firstMonday = lesson.semester.startDate;
      const title = lesson.course?.nameZh || lesson.nameZh || "未命名课程";
      const scheduleText = lesson.scheduleText?.dateTimePlaceText?.textZh || "";
      let scheduleIndex = 0;
      for (const rawPart of scheduleText.split(/[;；\n]+/)) {
        const part = normalizeText(rawPart).replace(/\n/g, " ");
        if (!part) continue;
        const seriesKey = `api:${lesson.id || lesson.code || title}:${scheduleIndex}`;
        scheduleIndex += 1;
        const match = part.match(/^(.+?周)\s*星期([一二三四五六日天])\s*(\d{1,2})\s*[~-]\s*(\d{1,2})\s*节\s*(.*)$/);
        if (!match) continue;
        const weeks = parseWeekSpec(match[1]);
        const course = {
          title,
          teachingCode: lesson.code || "",
          weekSpec: match[1],
          weeks,
          weekday: dayMap[match[2]],
          startPeriod: Number(match[3]),
          endPeriod: Number(match[4]),
          location: match[5].trim(),
          seriesKey,
          rawText: part
        };
        const key = [lesson.id || lesson.code || title, course.weekday, course.weekSpec, course.startPeriod, course.endPeriod, course.location].join("|");
        if (!weeks.length || seen.has(key)) continue;
        seen.add(key);
        courses.push(course);
      }
    }
    courses.sort((a, b) => a.weekday - b.weekday || a.startPeriod - b.startPeriod || a.title.localeCompare(b.title, "zh-CN"));
    return {
      courses,
      firstMonday,
      currentWeek: Number(data.currentWeek) || null,
      source: "api"
    };
  }

  function parseCourseText(rawText) {
    const text = normalizeText(rawText);
    const schedule = text.match(/\(([^()]*?周[^()]*)\)\s*\(\s*(\d{1,2})\s*[~-]\s*(\d{1,2})\s*节?\s*\)/);
    if (!schedule) return null;

    const codeMatch = text.match(/教学班代码\s*[:：]?\s*([A-Za-z0-9_-]+)/);
    const codeIndex = text.search(/教学班代码/);
    let title = codeIndex >= 0 ? text.slice(0, codeIndex) : text.slice(0, schedule.index);
    title = title.split("\n").map((item) => item.trim()).filter(Boolean)[0] || "未命名课程";

    const afterSchedule = text.slice((schedule.index || 0) + schedule[0].length).trim();
    const location = afterSchedule
      .replace(/^[,，;；\s]+/, "")
      .replace(/\s+[\u3400-\u9fff·]{2,12}\s*\([^()]{2,30}\)\s*$/, "")
      .replace(/\s*\([^()]{2,30}\)\s*$/, "")
      .trim();

    return {
      title,
      teachingCode: codeMatch ? codeMatch[1] : "",
      weekSpec: schedule[1],
      weeks: parseWeekSpec(schedule[1]),
      startPeriod: Number(schedule[2]),
      endPeriod: Number(schedule[3]),
      location,
      rawText: text
    };
  }

  function dateFromMonday(firstMonday, week, weekday) {
    const parts = String(firstMonday).split("-").map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) throw new Error("第 1 周周一日期无效");
    const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    date.setUTCDate(date.getUTCDate() + (week - 1) * 7 + (weekday - 1));
    return date.toISOString().slice(0, 10).replace(/-/g, "");
  }

  function escapeIcs(value) {
    return String(value || "")
      .replace(/\\/g, "\\\\")
      .replace(/\r?\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");
  }

  function qualifyCampusLocation(value) {
    let location = String(value || "").trim();
    location = location
      .replace(/田家炳教书院/g, "田家炳教育书院")
      .replace(/(^|\s)教书院/g, "$1田家炳教育书院");
    if (/^华东师范大学/.test(location)) return location;
    if (/^华师大/.test(location)) return location.replace(/^华师大/, "华东师范大学");
    if (/^(普陀校区|闵行校区)/.test(location)) return `华东师范大学${location}`;
    return location;
  }

  function escapeIcsParameter(value) {
    return String(value || "")
      .replace(/\\/g, "\\\\")
      .replace(/"/g, "\\\"")
      .replace(/\r?\n/g, " ");
  }

  function geoForLocation(location) {
    const building = BUILDING_GEO.find((item) => item.pattern.test(location));
    if (building) return building;
    if (/普陀校区/.test(location)) return CAMPUS_GEO.putuo;
    if (/闵行校区/.test(location)) return CAMPUS_GEO.minhang;
    return null;
  }

  function appleMapsUrl(location, geo) {
    const query = encodeURIComponent(location);
    const center = geo ? `&ll=${geo.latitude}%2C${geo.longitude}` : "";
    return `https://maps.apple.com/?q=${query}${center}`;
  }

  function foldIcsLine(line) {
    const output = [];
    let current = "";
    let bytes = 0;
    for (const char of line) {
      const size = new TextEncoder().encode(char).length;
      if (bytes + size > 73 && current) {
        output.push(current);
        current = " " + char;
        bytes = 1 + size;
      } else {
        current += char;
        bytes += size;
      }
    }
    output.push(current);
    return output.join("\r\n");
  }

  function makeUid(course, week, weekday, date) {
    const base = course.seriesKey
      ? [course.seriesKey, week].join("-")
      : [course.teachingCode || course.title, week, weekday, date, course.startPeriod].join("-");
    let hash = 0;
    for (let index = 0; index < base.length; index += 1) hash = (hash * 31 + base.charCodeAt(index)) >>> 0;
    return `ecnu-${hash.toString(16)}@byyt-calendar`;
  }

  function buildIcs(courses, options) {
    const settings = Object.assign({
      firstMonday: "",
      reminderMinutes: 15,
      calendarName: "华师大课表",
      timezone: "Asia/Shanghai",
      periodTimes: DEFAULT_PERIODS
    }, options || {});
    const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//ECNU//Timetable Calendar Exporter//ZH-CN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      `X-WR-CALNAME:${escapeIcs(settings.calendarName)}`,
      `X-WR-TIMEZONE:${settings.timezone}`
    ];
    if (settings.timezone === "Asia/Shanghai") {
      lines.push(
        "BEGIN:VTIMEZONE",
        "TZID:Asia/Shanghai",
        "X-LIC-LOCATION:Asia/Shanghai",
        "BEGIN:STANDARD",
        "TZOFFSETFROM:+0800",
        "TZOFFSETTO:+0800",
        "TZNAME:CST",
        "DTSTART:19700101T000000",
        "END:STANDARD",
        "END:VTIMEZONE"
      );
    }
    let eventCount = 0;

    for (const course of courses) {
      const startTime = settings.periodTimes[course.startPeriod];
      const endTime = settings.periodTimes[course.endPeriod];
      if (!startTime || !endTime || !course.weekday || !course.weeks.length) continue;
      for (const week of course.weeks) {
        const date = dateFromMonday(settings.firstMonday, week, course.weekday);
        const location = qualifyCampusLocation(course.location);
        const geo = geoForLocation(location);
        const description = [
          course.teachingCode ? `教学班代码：${course.teachingCode}` : "",
          `教学周：第${week}周（${course.weekSpec}）`,
          `节次：第${course.startPeriod}-${course.endPeriod}节`
        ].filter(Boolean).join("\n");
        lines.push(
          "BEGIN:VEVENT",
          `UID:${makeUid(course, week, course.weekday, date)}`,
          `DTSTAMP:${now}`,
          `DTSTART;TZID=${settings.timezone}:${date}T${startTime[0].replace(":", "")}00`,
          `DTEND;TZID=${settings.timezone}:${date}T${endTime[1].replace(":", "")}00`,
          `SUMMARY:${escapeIcs(course.title)}`,
          `LOCATION:${escapeIcs(location)}`,
          `DESCRIPTION:${escapeIcs(description)}`,
          "STATUS:CONFIRMED",
          "TRANSP:OPAQUE",
          "X-MICROSOFT-CDO-BUSYSTATUS:BUSY"
        );
        if (location) lines.push(`URL:${appleMapsUrl(location, geo)}`);
        if (geo) {
          const parameterLocation = escapeIcsParameter(location);
          lines.push(
            `GEO:${geo.latitude};${geo.longitude}`,
            `X-APPLE-STRUCTURED-LOCATION;VALUE=URI;X-ADDRESS="${parameterLocation}";X-APPLE-RADIUS=${geo.radius};X-TITLE="${parameterLocation}":geo:${geo.latitude},${geo.longitude}`
          );
        }
        if (Number(settings.reminderMinutes) >= 0) {
          lines.push(
            "BEGIN:VALARM",
            `TRIGGER:-PT${Math.round(Number(settings.reminderMinutes))}M`,
            "ACTION:DISPLAY",
            `DESCRIPTION:${escapeIcs(course.title)} 即将开始`,
            "END:VALARM"
          );
        }
        lines.push("END:VEVENT");
        eventCount += 1;
      }
    }
    lines.push("END:VCALENDAR");
    return { content: lines.map(foldIcsLine).join("\r\n") + "\r\n", eventCount };
  }

  return { DEFAULT_PERIODS, normalizeText, parseWeekSpec, parseCourseText, parseApiTimetable, dateFromMonday, buildIcs };
});
