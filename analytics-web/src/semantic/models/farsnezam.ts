import type { SemanticModel } from "../../contracts/semantic";

// Frontend mirror of the backend FarsNezam semantic models
// (src/Infrastructure/Analytics/Sql/FarsNezamSemanticModelStore.cs). Used in REAL mode
// (VITE_USE_MOCK_API="false") for the Ask-AI dataset picker + auto-viz role hints.
// The backend remains authoritative for AI grounding + SQL; ids/sources/fields MUST match it.
// `column` = field id (the backend resolves the real column via ResolvedColumn = id).

export const projectsModel: SemanticModel = {
  id: "model-projects",
  tenantId: "global",
  version: 1,
  defaultLocale: "fa-IR",
  name: { "fa-IR": "پروژه‌ها", "en-US": "Projects" },
  entities: [
    {
      id: "projects",
      source: "projects",
      name: { "fa-IR": "پروژه", "en-US": "Project" },
      description: { "fa-IR": "پروژه‌های ثبت‌شده در فارس‌نظام", "en-US": "FarsNezam projects" },
      fields: [
        { id: "ProjectNo", column: "ProjectNo", type: "string", role: "dimension",
          label: { "fa-IR": "شماره پرونده", "en-US": "File No" } },
        { id: "karfarma", column: "karfarma", type: "string", role: "dimension",
          label: { "fa-IR": "کارفرما", "en-US": "Client" }, synonyms: ["مالک", "owner"] },
        { id: "Mantaghe", column: "Mantaghe", type: "number", role: "dimension",
          label: { "fa-IR": "منطقه", "en-US": "Zone" }, synonyms: ["زون", "ناحیه", "region", "zone"] },
        { id: "Daftar", column: "Daftar", type: "number", role: "dimension",
          label: { "fa-IR": "دفتر", "en-US": "Office" } },
        { id: "Skelet", column: "Skelet", type: "number", role: "dimension",
          label: { "fa-IR": "اسکلت", "en-US": "Structure" }, synonyms: ["سازه", "structure"] },
        { id: "TypeProject", column: "TypeProject", type: "string", role: "dimension",
          label: { "fa-IR": "نوع پروژه", "en-US": "Project Type" }, synonyms: ["نوع", "type"] },
        { id: "type", column: "type", type: "number", role: "dimension",
          label: { "fa-IR": "نوع", "en-US": "Type" } },
        { id: "Tarikh", column: "Tarikh", type: "string", role: "dimension",
          label: { "fa-IR": "تاریخ", "en-US": "Date" }, synonyms: ["زمان", "date"] },
        { id: "TedadVahed", column: "TedadVahed", type: "number", role: "measure",
          label: { "fa-IR": "تعداد واحد", "en-US": "Units" }, synonyms: ["واحد", "units"],
          defaultAggregation: "sum", allowedAggregations: ["sum", "avg", "min", "max"],
          format: { kind: "number", decimals: 0, grouping: true } },
        { id: "TedadSaghf", column: "TedadSaghf", type: "number", role: "measure",
          label: { "fa-IR": "تعداد سقف", "en-US": "Floors" }, synonyms: ["سقف", "طبقه", "floors"],
          defaultAggregation: "sum", allowedAggregations: ["sum", "avg", "min", "max"],
          format: { kind: "number", decimals: 0, grouping: true } },
        { id: "Zirbana", column: "Zirbana", type: "number", role: "measure",
          label: { "fa-IR": "زیربنا", "en-US": "Built Area" }, synonyms: ["متراژ", "زیربنا", "area"],
          defaultAggregation: "sum", allowedAggregations: ["sum", "avg", "min", "max"],
          format: { kind: "number", decimals: 0, grouping: true } },
        { id: "masahat", column: "masahat", type: "number", role: "measure",
          label: { "fa-IR": "مساحت", "en-US": "Area" }, synonyms: ["مساحت", "area"],
          defaultAggregation: "sum", allowedAggregations: ["sum", "avg", "min", "max"],
          format: { kind: "number", decimals: 0, grouping: true } },
      ],
    },
  ],
};

export const membersModel: SemanticModel = {
  id: "model-members",
  tenantId: "global",
  version: 1,
  defaultLocale: "fa-IR",
  name: { "fa-IR": "اعضا", "en-US": "Members" },
  entities: [
    {
      id: "members",
      source: "members",
      name: { "fa-IR": "عضو", "en-US": "Member" },
      description: { "fa-IR": "اعضای سازمان نظام مهندسی فارس", "en-US": "FarsNezam organization members" },
      fields: [
        { id: "OzveyatID", column: "OzveyatID", type: "number", role: "dimension",
          label: { "fa-IR": "شناسه عضویت", "en-US": "Membership ID" }, hidden: true },
        { id: "Nam", column: "Nam", type: "string", role: "dimension",
          label: { "fa-IR": "نام", "en-US": "First Name" } },
        { id: "NameKhanevadegi", column: "NameKhanevadegi", type: "string", role: "dimension",
          label: { "fa-IR": "نام خانوادگی", "en-US": "Last Name" } },
        { id: "ShobeID", column: "ShobeID", type: "number", role: "dimension",
          label: { "fa-IR": "شعبه", "en-US": "Branch" }, synonyms: ["شعبه", "branch"] },
        { id: "ReshteID", column: "ReshteID", type: "string", role: "dimension",
          label: { "fa-IR": "رشته", "en-US": "Discipline" }, synonyms: ["رشته", "discipline"] },
        { id: "Vazeyat", column: "Vazeyat", type: "number", role: "dimension",
          label: { "fa-IR": "وضعیت", "en-US": "Status" }, synonyms: ["وضعیت", "status"] },
        { id: "Jenseyat", column: "Jenseyat", type: "string", role: "dimension",
          label: { "fa-IR": "جنسیت", "en-US": "Gender" }, synonyms: ["جنسیت", "gender"] },
        { id: "MadrakID", column: "MadrakID", type: "number", role: "dimension",
          label: { "fa-IR": "مدرک", "en-US": "Degree" }, synonyms: ["مدرک", "تحصیلات", "degree"] },
        { id: "Tarikh", column: "Tarikh", type: "string", role: "dimension",
          label: { "fa-IR": "تاریخ", "en-US": "Date" } },
      ],
    },
  ],
};

export const legalProjectsModel: SemanticModel = {
  id: "model-legal-projects",
  tenantId: "global",
  version: 1,
  defaultLocale: "fa-IR",
  name: { "fa-IR": "پروژه‌های حقوقی", "en-US": "Legal Projects" },
  entities: [
    {
      id: "legal_projects",
      source: "legal_projects",
      name: { "fa-IR": "پروژه حقوقی", "en-US": "Legal Project" },
      description: { "fa-IR": "لیست پروژه‌های حقوقی فارس‌نظام", "en-US": "FarsNezam legal projects" },
      fields: [
        { id: "Id", column: "Id", type: "number", role: "dimension",
          label: { "fa-IR": "شناسه", "en-US": "ID" }, hidden: true },
        { id: "ProjectNo", column: "ProjectNo", type: "string", role: "dimension",
          label: { "fa-IR": "شماره پرونده", "en-US": "File No" } },
        { id: "DaftarNo", column: "DaftarNo", type: "number", role: "dimension",
          label: { "fa-IR": "شماره دفتر", "en-US": "Office No" } },
        // Backend LEFT JOINs tblMap_TypMohandes, so this returns the role title (string), not a code.
        { id: "Typ", column: "Typ", type: "string", role: "dimension",
          label: { "fa-IR": "نوع خدمت", "en-US": "Service Type" }, synonyms: ["نوع", "خدمت", "type"] },
        { id: "GroupBuild", column: "GroupBuild", type: "number", role: "dimension",
          label: { "fa-IR": "گروه ساختمان", "en-US": "Building Group" }, synonyms: ["گروه", "group"] },
        { id: "FYear", column: "FYear", type: "number", role: "dimension",
          label: { "fa-IR": "سال", "en-US": "Year" }, synonyms: ["سال", "year"] },
        { id: "Active", column: "Active", type: "string", role: "dimension",
          label: { "fa-IR": "فعال", "en-US": "Active" }, synonyms: ["فعال", "active"] },
        { id: "FullMeter", column: "FullMeter", type: "number", role: "measure",
          label: { "fa-IR": "متراژ کل", "en-US": "Total Area" }, synonyms: ["متراژ", "مساحت", "area"],
          defaultAggregation: "sum", allowedAggregations: ["sum", "avg", "min", "max"],
          format: { kind: "number", decimals: 0, grouping: true } },
        { id: "OffMeter", column: "OffMeter", type: "number", role: "measure",
          label: { "fa-IR": "متراژ آفیس", "en-US": "Office Area" },
          defaultAggregation: "sum", allowedAggregations: ["sum", "avg", "min", "max"],
          format: { kind: "number", decimals: 0, grouping: true } },
      ],
    },
  ],
};
