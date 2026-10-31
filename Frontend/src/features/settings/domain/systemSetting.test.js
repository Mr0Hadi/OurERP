import { describe, expect, it } from "vitest";
import { SETTING_TYPE, changedSettings, formatSettingValue, groupAnchor, groupIcon, isCustomValue, isFormGroup, serverValue, settingValueError, textKind } from "./systemSetting";

const int = { key: "Sale.ProformaMinutes", type: SETTING_TYPE.INTEGER, value: "15", defaultValue: "10", minValue: 1, maxValue: 60, unit: "دقیقه" };
const flag = { key: "Warehouse.Multi", type: SETTING_TYPE.BOOLEAN, value: null, defaultValue: "false" };

describe("تنظیمات", () => {
  it("مقدارِ مؤثر و «سفارشی»", () => {
    expect([serverValue(int), serverValue(flag), serverValue({})]).toEqual(["15", "false", ""]);
    expect([isCustomValue(int, "10"), isCustomValue(int, "11"), isCustomValue({}, "")]).toEqual([false, true, false]);
  });

  it("خطای عددِ صحیح و مرزها؛ غیرعددی بی‌خطا", () => {
    expect(["", "1.5", "abc", "0", "61", "1", "60", "-0"].map((value) => settingValueError(int, value))).toEqual([
      "مقدار را وارد کنید.", "عدد صحیح وارد کنید.", "عدد صحیح وارد کنید.", "کمتر از 1 مجاز نیست.", "بیشتر از 60 مجاز نیست.", null, null, "کمتر از 1 مجاز نیست.",
    ]);
    expect(settingValueError({ type: SETTING_TYPE.INTEGER }, "-999")).toBe(null);
    expect(settingValueError(flag, "")).toBe(null);
  });

  it("بدنه‌ی ذخیره: فقط تغییرکرده‌ها؛ برابر با پیش‌فرض = \"\" (پاک‌کردنِ سطر)", () => {
    const groups = [{ settings: [int, flag, { key: "x", type: SETTING_TYPE.TEXT, value: "a", defaultValue: "" }] }];
    expect(changedSettings(groups, { [int.key]: "15", [flag.key]: "true", x: "a" })).toEqual([{ key: flag.key, value: "true" }]);
    expect(changedSettings(groups, { [int.key]: "10" })).toEqual([{ key: int.key, value: "" }]);
    expect(changedSettings(groups, {})).toEqual([]);
  });

  it("نمایش، ویرایشگر و گروه", () => {
    expect([formatSettingValue(flag, "true"), formatSettingValue(flag, "x"), formatSettingValue(int, "5"), formatSettingValue({}, "a")]).toEqual(["روشن", "خاموش", "5 دقیقه", "a"]);
    expect([textKind({ key: "Company.PostalCode" }), textKind({ key: "Company.Address" }), textKind({ key: "?" })]).toEqual(["digits", "multiline", "text"]);
    expect(groupIcon(1)).not.toBe(groupIcon(99));
    expect(groupAnchor(3)).toBe("setting-group-3");
    expect(isFormGroup({ settings: [{ type: SETTING_TYPE.TEXT }] })).toBe(true);
    expect(isFormGroup({ settings: [{ type: SETTING_TYPE.TEXT }, int] })).toBe(false);
    expect(isFormGroup({ settings: [] })).toBe(false);
  });
});
