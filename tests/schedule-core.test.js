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

const course = core.parseCourseText("数据科学与工程理论基础\n教学班代码：202621152\n(1~3,5~18周) (4-5节) 普陀校区 二附中实验楼阶梯教室 黄定江(20170121)");
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
assert.match(calendar.content, /LOCATION:华东师范大学普陀校区 二附中实验楼阶梯教室/);
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
  ["闵行校区 第一教学楼101", "华东师范大学闵行校区 第一教学楼101"],
  ["普陀校区 教书院418", "华东师范大学普陀校区 田家炳教育书院418"],
  ["普陀校区 田家炳教育书院419", "华东师范大学普陀校区 田家炳教育书院419"],
  ["华东师范大学普陀校区 文附楼225", "华东师范大学普陀校区 文附楼225"],
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

const apiResult = core.parseApiTimetable({
  currentWeek: 2,
  weekIndices: [1, 2, 3, 4, 5, 6],
  lessons: [{
    id: 893117,
    code: "202620333",
    nameZh: "教育原理-2026秋",
    course: { nameZh: "教育原理" },
    semester: { startDate: "2026-09-14" },
    scheduleText: { dateTimePlaceText: { textZh: "3~5(单),6~12周 星期一 6~8节 普陀校区 文附楼225; \n4周 星期六 6~8节 普陀校区 文附楼225" } }
  }]
});
assert.equal(apiResult.source, "api");
assert.equal(apiResult.firstMonday, "2026-09-14");
assert.equal(apiResult.currentWeek, 2);
assert.equal(apiResult.courses.length, 2);
assert.deepEqual(apiResult.courses[0].weeks, [3, 5, 6, 7, 8, 9, 10, 11, 12]);
assert.equal(apiResult.courses[1].weekday, 6);
assert.equal(apiResult.courses[1].location, "普陀校区 文附楼225");
assert.equal(apiResult.courses[0].seriesKey, "api:893117:0");
assert.equal(apiResult.courses[1].seriesKey, "api:893117:1");

console.log("schedule-core tests passed");
