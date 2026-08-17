"use client";

export type BuildingId = "pangyo" | "future";

export type WorkplaceBuilding = {
  id: BuildingId;
  name: string;
  shortName: string;
  description: string;
  status: "active" | "setup";
  floorLabels: string[];
};

export const workplaceBuildings: WorkplaceBuilding[] = [
  {
    id: "pangyo",
    name: "판교 오피스",
    shortName: "판교",
    description: "현재 운영 건물",
    status: "active",
    floorLabels: ["3층", "14층", "15층", "17층"],
  },
  {
    id: "future",
    name: "신규 오피스",
    shortName: "신규",
    description: "확장 시 도면·정책 등록",
    status: "setup",
    floorLabels: [],
  },
];

export function getWorkplaceBuilding(buildingId: BuildingId) {
  return workplaceBuildings.find((building) => building.id === buildingId) ?? workplaceBuildings[0];
}

function BuildingGlyph() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 21V5l8-3v19M12 8h8v13M2 21h20"/><path d="M7.5 7h1M7.5 11h1M7.5 15h1M16 12h1M16 16h1"/></svg>;
}

export function BuildingPicker({ value, onChange, label = "이용 건물" }: {
  value: BuildingId;
  onChange: (buildingId: BuildingId) => void;
  label?: string;
}) {
  const building = getWorkplaceBuilding(value);
  return (
    <section className="building-picker-card">
      <span className="building-picker-icon"><BuildingGlyph /></span>
      <label>
        <small>{label}</small>
        <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value as BuildingId)}>
          {workplaceBuildings.map((item) => <option key={item.id} value={item.id}>{item.name}{item.status === "setup" ? " · 준비 중" : ""}</option>)}
        </select>
      </label>
      <em className={building.status}>{building.status === "active" ? `${building.floorLabels.length}개 층` : "도면 미등록"}</em>
    </section>
  );
}

export function LocationSetupState({ buildingId, admin }: { buildingId: BuildingId; admin?: boolean }) {
  const building = getWorkplaceBuilding(buildingId);
  return (
    <section className="location-setup-state">
      <span><BuildingGlyph /></span>
      <div>
        <small>{building.shortName.toUpperCase()} OFFICE</small>
        <h2>{building.name} 준비 중</h2>
        <p>{admin ? "건물 정보와 층별 도면을 등록하면 좌석·회의실 정책을 바로 설정할 수 있어요." : "관리자가 층별 도면과 예약 정책을 등록한 뒤 이용할 수 있어요."}</p>
      </div>
      <ol>
        <li><b>1</b><span>건물 기본정보</span></li>
        <li><b>2</b><span>층·도면 등록</span></li>
        <li><b>3</b><span>좌석·회의실 정책</span></li>
      </ol>
    </section>
  );
}
