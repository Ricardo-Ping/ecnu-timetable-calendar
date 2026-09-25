const assert = require("node:assert/strict");
const core = require("../lib/schedule-core.js");

assert.deepEqual(core.DEFAULT_PERIODS, {
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
});

assert.deepEqual(core.parseWeekSpec("1~3,5~18周"), [1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]);
assert.deepEqual(core.parseWeekSpec("1-9周单"), [1, 3, 5, 7, 9]);
assert.deepEqual(core.parseWeekSpec("2~10双周"), [2, 4, 6, 8, 10]);
assert.deepEqual(core.parseWeekSpec("3~5(单),6~12周"), [3, 5, 6, 7, 8, 9, 10, 11, 12]);

const course = core.parseCourseText("数据科学与工程理论基础\n教学班代码：202621152\n(1~3,5~18周) (4-5节) 普陀校区 二附中实验楼 黄定江(20170121)");
assert.equal(course.title, "数据科学与工程理论基础");
assert.equal(course.teachingCode, "202621152");
assert.equal(course.startPeriod, 4);
assert.equal(course.endPeriod, 5);
assert.match(course.location, /普陀校区/);
assert.ok(!course.location.includes("黄定江"));
assert.equal(core.dateFromMonday("2026-09-21", 1, 4), "20260924");
assert.equal(core.dateFromMonday("2026-09-21", 2, 1), "20260928");

course.weekday = 1;
const calendar = core.buildIcs([course], { firstMonday: "2026-09-21", reminderMinutes: 15 });
assert.equal(calendar.eventCount, 17);
assert.match(calendar.content, /DTSTART;TZID=Asia\/Shanghai:20260921T104000/);
assert.match(calendar.content, /DTEND;TZID=Asia\/Shanghai:20260921T121500/);
assert.match(calendar.content, /TRIGGER:-PT15M/);
assert.match(calendar.content, /BEGIN:VTIMEZONE/);
assert.match(calendar.content, /TZID:Asia\/Shanghai/);
assert.match(calendar.content, /X-MICROSOFT-CDO-BUSYSTATUS:BUSY/);
assert.match(calendar.content, /LOCATION:华东师范大学普陀校区 二附中实验楼/);
const unfoldedCalendar = calendar.content.replace(/\r\n /g, "");
assert.match(unfoldedCalendar, /GEO:31\.224052;121\.399648/);
assert.match(unfoldedCalendar, /X-APPLE-STRUCTURED-LOCATION;VALUE=URI;X-ADDRESS="华东师范大学普陀校区 二附中实验楼"/);
assert.match(unfoldedCalendar, /X-TITLE="华东师范大学普陀校区 二附中实验楼":geo:31\.224052,121\.399648/);
assert.match(unfoldedCalendar, /URL:https:\/\/maps\.apple\.com\/\?q=/);
assert.ok(!calendar.content.includes("20261012T104000"), "第 4 周不应生成事件");

const stableOriginal = core.buildIcs([{ ...course, weeks: [1], seriesKey: "api:lesson-1:0" }], { firstMonday: "2026-09-21" });
const stableMoved = core.buildIcs([{
  ...course,
  weeks: [1],
  weekday: 3,
  startPeriod: 8,
  endPeriod: 9,
  seriesKey: "api:lesson-1:0"
}], { firstMonday: "2026-09-21" });
assert.equal(stableOriginal.content.match(/UID:([^\r\n]+)/)[1], stableMoved.content.match(/UID:([^\r\n]+)/)[1], "调课后 UID 应保持稳定");

const locationCases = [
  ["闵行校区 第一教学楼", "华东师范大学闵行校区 第一教学楼"],
  ["普陀校区 教书院", "华东师范大学普陀校区 田家炳教育书院"],
  ["普陀校区 田家炳教育书院", "华东师范大学普陀校区 田家炳教育书院"],
  ["华东师范大学普陀校区 文附楼", "华东师范大学普陀校区 文附楼"],
  ["临港校区 滴水湖国际软件学院", "华东师范大学临港校区 滴水湖国际软件学院"],
  ["上海图书馆", "上海图书馆"]
];
for (const [location, expected] of locationCases) {
  const result = core.buildIcs([{
    ...course,
    weeks: [1],
    location
  }], { firstMonday: "2026-09-21", reminderMinutes: 15 });
  assert.match(result.content, new RegExp(`LOCATION:${expected}`));
}

const minhangCalendar = core.buildIcs([{
  ...course,
  weeks: [1],
  location: "闵行校区 第一教学楼"
}], { firstMonday: "2026-09-21" }).content.replace(/\r\n /g, "");
assert.match(minhangCalendar, /GEO:31\.032074;121\.449955/);
assert.match(minhangCalendar, /geo:31\.032074,121\.449955/);

function eventGeoFor(location) {
  const content = core.buildIcs([{
    ...course,
    weeks: [1],
    location
  }], { firstMonday: "2026-09-21" }).content.replace(/\r\n /g, "");
  return content.match(/GEO:([^\r\n]+)/)?.[1] || "";
}

assert.notEqual(
  eventGeoFor("普陀校区 小教楼"),
  eventGeoFor("普陀校区 干训楼"),
  "普陀校区不同楼宇不应共用校区中心坐标"
);
assert.equal(eventGeoFor("普陀校区 小教楼"), "31.228443;121.402722");
assert.equal(eventGeoFor("普陀校区 干训楼"), "31.231929;121.401502");
assert.equal(eventGeoFor("普陀校区 教书院"), "31.232862;121.402135");
assert.equal(eventGeoFor("普陀校区 文史楼"), "31.230611;121.404023");
assert.equal(eventGeoFor("普陀校区 文附楼"), "31.228494;121.403977");
assert.equal(eventGeoFor("普陀校区 未收录教学楼"), "");

// Fixed representative samples across all ECNU campuses. These use building
// names only; no personal room numbers are part of the location table or test.
const representativeBuildingGeos = [
  ["普陀校区 小教楼", "31.228443;121.402722"],
  ["普陀校区 图书馆", "31.230262;121.401789"],
  ["普陀校区 地理馆", "31.228409;121.399225"],
  ["闵行校区 第一教学楼", "31.032074;121.449955"],
  ["闵行校区 第四教学楼", "31.031366;121.445698"],
  ["闵行校区 实验B楼", "31.034953;121.447616"],
  ["闵行校区 图书馆", "31.030892;121.447680"],
  ["闵行校区 法商北楼", "31.029783;121.450532"],
  ["临港校区 滴水湖国际软件学院", "30.902492;121.919025"],
  ["临港校区 临港软件园", "30.903160;121.921479"]
];
for (const [location, expectedGeo] of representativeBuildingGeos) {
  assert.equal(eventGeoFor(location), expectedGeo, `${location} 应定位到对应楼宇`);
}
assert.equal(eventGeoFor("闵行校区 未收录教学楼"), "");
assert.equal(eventGeoFor("临港校区 未收录建筑"), "");
assert.equal(eventGeoFor("普陀校区"), "31.227938;121.404680");
assert.equal(eventGeoFor("闵行校区"), "31.032910;121.449530");
assert.equal(eventGeoFor("临港校区"), "30.872500;121.916000");

const unknownBuildingCalendar = core.buildIcs([{
  ...course,
  weeks: [1],
  location: "闵行校区 未收录教学楼"
}], { firstMonday: "2026-09-21" }).content.replace(/\r\n /g, "");
assert.doesNotMatch(unknownBuildingCalendar, /GEO:/);
assert.doesNotMatch(unknownBuildingCalendar, /X-APPLE-STRUCTURED-LOCATION/);
assert.match(unknownBuildingCalendar, /URL:https:\/\/maps\.apple\.com\/\?q=/);

for (const campus of ["普陀校区", "闵行校区", "临港校区"]) {
  const geos = representativeBuildingGeos
    .filter(([location]) => location.startsWith(campus))
    .map(([, geo]) => geo);
  assert.equal(new Set(geos).size, geos.length, `${campus}的抽样楼宇不应共用同一坐标`);
}

const externalCalendar = core.buildIcs([{
  ...course,
  weeks: [1],
  location: "上海图书馆"
}], { firstMonday: "2026-09-21" }).content.replace(/\r\n /g, "");
assert.doesNotMatch(externalCalendar, /X-APPLE-STRUCTURED-LOCATION/);
assert.match(externalCalendar, /URL:https:\/\/maps\.apple\.com\/\?q=/);

const apiResult = core.parseApiTimetable({
  currentWeek: 2,
  weekIndices: [1, 2, 3, 4, 5, 6],
  lessons: [{
    id: 893117,
    code: "202620333",
    nameZh: "教育原理-2026秋",
    course: { nameZh: "教育原理" },
    semester: { startDate: "2026-09-14" },
    scheduleText: { dateTimePlaceText: { textZh: "3~5(单),6~12周 星期一 6~8节 普陀校区 文附楼; \n4周 星期六 6~8节 普陀校区 文附楼" } }
  }]
});
assert.equal(apiResult.source, "api");
assert.equal(apiResult.firstMonday, "2026-09-14");
assert.equal(apiResult.currentWeek, 2);
assert.equal(apiResult.courses.length, 2);
assert.deepEqual(apiResult.courses[0].weeks, [3, 5, 6, 7, 8, 9, 10, 11, 12]);
assert.equal(apiResult.courses[1].weekday, 6);
assert.equal(apiResult.courses[1].location, "普陀校区 文附楼");
assert.equal(apiResult.courses[0].seriesKey, "api:893117:0");
assert.equal(apiResult.courses[1].seriesKey, "api:893117:1");

console.log("schedule-core tests passed");
