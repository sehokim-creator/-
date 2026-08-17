"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { RoomAdminPanel, RoomEmployeePanel } from "./room-management";
import type { RoomBookingPayload, RoomRecord } from "./room-management";
import { BuildingPicker, getWorkplaceBuilding, LocationSetupState } from "./workplace-locations";
import type { BuildingId } from "./workplace-locations";

export type FloorId = "3" | "14" | "15" | "17";
type WingId = "north" | "south";
export type SeatStatus = "available" | "assigned" | "pending" | "reserved" | "blocked";
export type SeatPolicyMode = "fixed" | "shared";

export type SeatRecord = {
  id: string;
  buildingId: BuildingId;
  floorId: FloorId;
  zoneId: string;
  zoneLabel: string;
  number: number;
  status: SeatStatus;
  assignedTo?: string;
  department?: string;
  effectiveDate?: string;
  equipment: string[];
};

export type SeatPolicyRecord = {
  zoneId: string;
  buildingId: BuildingId;
  floorId: FloorId;
  zoneLabel: string;
  mode: SeatPolicyMode;
  advanceBookingDays: number;
  maxConsecutiveDays: number;
  checkInRequired: boolean;
  autoReleaseMinutes: number;
  fixedApprovalRequired: boolean;
  updatedAt: string;
};

export type SeatPolicyUpdate = Partial<Pick<SeatPolicyRecord,
  "mode" | "advanceBookingDays" | "maxConsecutiveDays" | "checkInRequired" | "autoReleaseMinutes" | "fixedApprovalRequired"
>>;

export type SeatReservation = {
  id: string;
  seatId: string;
  date: string;
  employee: string;
  department: string;
  status: "reserved" | "checked-in";
  createdBy: "employee" | "admin";
};

export type SharedSeatReservationPayload = {
  employee: string;
  department: string;
  date: string;
};

type MapRect = {
  label: string;
  wing?: WingId;
  x: number;
  y: number;
  width: number;
  height: number;
  kind?: "room" | "core" | "support";
};

type SeatZone = MapRect & {
  id: string;
  code: string;
  wing: WingId;
  count: number;
  columns: number;
};

type FloorDefinition = {
  buildingId: BuildingId;
  id: FloorId;
  label: string;
  occupied: number;
  vacant: number;
  wings: WingId[];
  canvasHeight: number;
  description: string;
  zones: SeatZone[];
  rooms: MapRect[];
};

export type SeatTotals = {
  total: number;
  assigned: number;
  available: number;
  pending: number;
  reserved: number;
  blocked: number;
};

const floorDefinitions: FloorDefinition[] = [
  {
    buildingId: "pangyo",
    id: "3",
    label: "3층",
    occupied: 73,
    vacant: 8,
    wings: ["north"],
    canvasHeight: 420,
    description: "북측 단일 도면 · 업무좌석과 3.1·3.2 회의실",
    zones: [
      { id: "3-a", code: "A", label: "북측 A", wing: "north", count: 20, columns: 5, x: 28, y: 8, width: 28, height: 27 },
      { id: "3-b", code: "B", label: "북측 B", wing: "north", count: 24, columns: 6, x: 60, y: 8, width: 35, height: 27 },
      { id: "3-c", code: "C", label: "북측 C", wing: "north", count: 16, columns: 4, x: 28, y: 62, width: 25, height: 25 },
      { id: "3-d", code: "D", label: "북측 D", wing: "north", count: 21, columns: 7, x: 62, y: 62, width: 33, height: 25 },
    ],
    rooms: [
      { label: "Storage", x: 3, y: 8, width: 19, height: 17, kind: "support" },
      { label: "Server Room", x: 3, y: 29, width: 19, height: 17, kind: "support" },
      { label: "3.2 Meeting Room", x: 28, y: 41, width: 27, height: 15 },
      { label: "3.1 Meeting Room", x: 59, y: 41, width: 27, height: 15 },
      { label: "출입구", x: 88, y: 42, width: 8, height: 12, kind: "core" },
    ],
  },
  {
    buildingId: "pangyo",
    id: "14",
    label: "14층",
    occupied: 154,
    vacant: 26,
    wings: ["north", "south"],
    canvasHeight: 520,
    description: "북측·남측 업무좌석과 포커스룸",
    zones: [
      { id: "14-nw", code: "N-A", label: "북측 A", wing: "north", count: 48, columns: 8, x: 3, y: 6, width: 35, height: 31 },
      { id: "14-ne", code: "N-B", label: "북측 B", wing: "north", count: 42, columns: 7, x: 42, y: 6, width: 34, height: 31 },
      { id: "14-sw", code: "S-A", label: "남측 A", wing: "south", count: 48, columns: 8, x: 16, y: 62, width: 34, height: 31 },
      { id: "14-se", code: "S-B", label: "남측 B", wing: "south", count: 42, columns: 7, x: 53, y: 62, width: 24, height: 31 },
    ],
    rooms: [
      { label: "중앙 코어 · EV · 화장실", x: 20, y: 42, width: 50, height: 13, kind: "core" },
      { label: "Community Center", wing: "north", x: 80, y: 6, width: 16, height: 14, kind: "support" },
      { label: "Coffee Silo", wing: "north", x: 80, y: 23, width: 16, height: 14, kind: "support" },
      { label: "14.3~14.6 Meeting", wing: "south", x: 2, y: 62, width: 11, height: 31 },
      { label: "14.1·14.2 Meeting", wing: "south", x: 80, y: 62, width: 16, height: 14 },
      { label: "Interview · Phone Booth", wing: "south", x: 80, y: 79, width: 16, height: 14, kind: "support" },
    ],
  },
  {
    buildingId: "pangyo",
    id: "15",
    label: "15층",
    occupied: 133,
    vacant: 13,
    wings: ["north", "south"],
    canvasHeight: 520,
    description: "회의실 중심 북측과 업무좌석 중심 남측",
    zones: [
      { id: "15-nw", code: "N-A", label: "북측 A", wing: "north", count: 18, columns: 6, x: 4, y: 29, width: 28, height: 18 },
      { id: "15-ne", code: "N-B", label: "북측 B", wing: "north", count: 18, columns: 6, x: 67, y: 29, width: 28, height: 18 },
      { id: "15-sw", code: "S-A", label: "남측 A", wing: "south", count: 56, columns: 8, x: 16, y: 64, width: 35, height: 29 },
      { id: "15-se", code: "S-B", label: "남측 B", wing: "south", count: 54, columns: 9, x: 54, y: 64, width: 34, height: 29 },
    ],
    rooms: [
      { label: "15.1~15.4 Meeting", wing: "north", x: 3, y: 5, width: 28, height: 18 },
      { label: "15.5~15.8 Meeting", wing: "north", x: 68, y: 5, width: 28, height: 18 },
      { label: "중앙 코어 · EV · 화장실", x: 27, y: 48, width: 46, height: 12, kind: "core" },
      { label: "Focus · Phone Booth", wing: "north", x: 35, y: 5, width: 13, height: 18, kind: "support" },
      { label: "Massage · Focus", wing: "north", x: 52, y: 5, width: 12, height: 18, kind: "support" },
      { label: "15.10·15.11 Meeting", wing: "south", x: 2, y: 64, width: 11, height: 29 },
      { label: "15.9·15.12·15.13 Meeting", wing: "south", x: 91, y: 64, width: 7, height: 29 },
    ],
  },
  {
    buildingId: "pangyo",
    id: "17",
    label: "17층",
    occupied: 124,
    vacant: 28,
    wings: ["north"],
    canvasHeight: 420,
    description: "북측 단일 도면 · 업무좌석과 회의실·OA존",
    zones: [
      { id: "17-a", code: "A", label: "북측 A", wing: "north", count: 40, columns: 8, x: 20, y: 6, width: 36, height: 34 },
      { id: "17-b", code: "B", label: "북측 B", wing: "north", count: 40, columns: 8, x: 20, y: 51, width: 36, height: 34 },
      { id: "17-c", code: "C", label: "북측 C", wing: "north", count: 36, columns: 6, x: 61, y: 6, width: 34, height: 34 },
      { id: "17-d", code: "D", label: "북측 D", wing: "north", count: 36, columns: 6, x: 61, y: 51, width: 34, height: 34 },
    ],
    rooms: [
      { label: "17.3·17.4 Meeting", x: 3, y: 6, width: 14, height: 31 },
      { label: "17.2 Meeting", x: 3, y: 51, width: 14, height: 20 },
      { label: "Phone Booth", x: 3, y: 75, width: 14, height: 10, kind: "support" },
      { label: "OA존 · Focus Room", x: 61, y: 88, width: 34, height: 8, kind: "support" },
      { label: "중앙 통로", x: 20, y: 43, width: 75, height: 5, kind: "core" },
    ],
  },
];

const people = ["김도윤", "박서연", "이준호", "최유진", "정하늘", "윤지수", "한예린", "오민석", "권수현", "배지훈", "문서윤", "장민재"];
const departments = ["Product", "Engineering", "Finance", "People", "Sales", "Security", "Workplace"];
const POC_TODAY = "2026-08-18";
// 현재 운영 기준은 전 구역 고정석이며, 관리자가 구역별로 공유좌석 전환을 시험할 수 있다.
const initiallySharedZones = new Set<string>();

function policyModeLabel(mode: SeatPolicyMode) {
  return mode === "fixed" ? "고정석" : "공유좌석";
}

export function createInitialSeatPolicies(): SeatPolicyRecord[] {
  return floorDefinitions.flatMap((floor) => floor.zones.map((zone) => ({
    zoneId: zone.id,
    buildingId: floor.buildingId,
    floorId: floor.id,
    zoneLabel: zone.label,
    mode: initiallySharedZones.has(zone.id) ? "shared" : "fixed",
    advanceBookingDays: 30,
    maxConsecutiveDays: 5,
    checkInRequired: true,
    autoReleaseMinutes: 30,
    fixedApprovalRequired: true,
    updatedAt: "2026-08-17",
  })));
}

export function createInitialSeats(): SeatRecord[] {
  const policyMap = new Map(createInitialSeatPolicies().map((policy) => [policy.zoneId, policy.mode]));
  let currentSeatMarked = false;

  return floorDefinitions.flatMap((floor) => {
    let floorIndex = 0;
    const total = floor.zones.reduce((sum, zone) => sum + zone.count, 0);
    if (total !== floor.occupied + floor.vacant) throw new Error(`${floor.label} 좌석 합계가 원본 도면과 일치하지 않습니다.`);
    const vacant = floor.vacant;
    const vacantIndexes = new Set(Array.from({ length: vacant }, (_, index) => Math.floor(((index + 0.5) * total) / vacant)));
    return floor.zones.flatMap((zone) => Array.from({ length: zone.count }, (_, zoneIndex) => {
      const index = floorIndex++;
      const isShared = policyMap.get(zone.id) === "shared";
      const assigned = !isShared && !vacantIndexes.has(index);
      const id = `${floor.id}F-${zone.code}-${String(zoneIndex + 1).padStart(3, "0")}`;
      const equipment = [index % 9 === 0 ? "듀얼 모니터" : "모니터 1대"];
      if (index % 17 === 0) equipment.push("높이조절 데스크");
      let assignedTo = assigned ? people[index % people.length] : undefined;
      let department = assigned ? departments[index % departments.length] : undefined;

      if (floor.id === "14" && assigned && !currentSeatMarked) {
        assignedTo = "본인";
        department = "내 소속팀";
        currentSeatMarked = true;
      }

      return {
        id,
        buildingId: floor.buildingId,
        floorId: floor.id,
        zoneId: zone.id,
        zoneLabel: zone.label,
        number: zoneIndex + 1,
        status: assigned ? "assigned" : "available",
        assignedTo,
        department,
        effectiveDate: assigned ? "2026-08-01" : undefined,
        equipment,
      } satisfies SeatRecord;
    }));
  });
}

export function createInitialSeatReservations(seats: SeatRecord[], policies: SeatPolicyRecord[]): SeatReservation[] {
  const sharedZones = new Set(policies.filter((policy) => policy.mode === "shared").map((policy) => policy.zoneId));
  const sharedSeats = seats.filter((seat) => sharedZones.has(seat.zoneId));
  const samples = [
    { seat: sharedSeats[0], employee: "본인", department: "내 소속팀", status: "reserved" as const },
    { seat: sharedSeats[9], employee: "박서연", department: "Engineering", status: "checked-in" as const },
    { seat: sharedSeats[28], employee: "이준호", department: "Product", status: "reserved" as const },
    { seat: sharedSeats[54], employee: "최유진", department: "People", status: "reserved" as const },
  ].filter((sample): sample is { seat: SeatRecord; employee: string; department: string; status: "reserved" | "checked-in" } => Boolean(sample.seat));

  return samples.map((sample, index) => ({
    id: `SR-20260818-${String(index + 1).padStart(3, "0")}`,
    seatId: sample.seat.id,
    date: "2026-08-18",
    employee: sample.employee,
    department: sample.department,
    status: sample.status,
    createdBy: index === 0 ? "employee" : "admin",
  }));
}

function getSeatPolicy(seat: SeatRecord, policies: SeatPolicyRecord[]) {
  return policies.find((policy) => policy.zoneId === seat.zoneId) ?? {
    zoneId: seat.zoneId,
    buildingId: seat.buildingId,
    floorId: seat.floorId,
    zoneLabel: seat.zoneLabel,
    mode: "fixed" as const,
    advanceBookingDays: 30,
    maxConsecutiveDays: 5,
    checkInRequired: true,
    autoReleaseMinutes: 30,
    fixedApprovalRequired: true,
    updatedAt: "2026-08-17",
  };
}

function getReservation(seat: SeatRecord, reservations: SeatReservation[], date: string) {
  return reservations.find((reservation) => reservation.seatId === seat.id && reservation.date === date);
}

function getDisplayStatus(seat: SeatRecord, policy: SeatPolicyRecord, reservation?: SeatReservation): SeatStatus {
  if (seat.status === "blocked") return "blocked";
  if (policy.mode === "shared") {
    if (seat.status === "assigned" || seat.status === "pending" || seat.status === "reserved") return seat.status;
    return reservation ? "reserved" : "available";
  }
  return seat.status;
}

export function getSeatTotals(
  seats: SeatRecord[],
  policies?: SeatPolicyRecord[],
  reservations: SeatReservation[] = [],
  date = "2026-08-18",
): SeatTotals {
  return seats.reduce<SeatTotals>((totals, seat) => {
    const status = policies
      ? getDisplayStatus(seat, getSeatPolicy(seat, policies), getReservation(seat, reservations, date))
      : seat.status;
    totals.total += 1;
    if (status === "available") totals.available += 1;
    if (status === "assigned") totals.assigned += 1;
    if (status === "pending") totals.pending += 1;
    if (status === "reserved") totals.reserved += 1;
    if (status === "blocked") totals.blocked += 1;
    return totals;
  }, { total: 0, assigned: 0, available: 0, pending: 0, reserved: 0, blocked: 0 });
}

function statusLabel(status: SeatStatus, mode: SeatPolicyMode = "fixed") {
  if (mode === "shared") {
    return { available: "예약 가능", assigned: "사용 중", pending: "승인 대기", reserved: "예약 완료", blocked: "사용 중지" }[status];
  }
  return { available: "배정 가능", assigned: "배정 완료", pending: "신청 중", reserved: "향후 배정", blocked: "사용 중지" }[status];
}

function isWithinAdvanceWindow(date: string, advanceBookingDays: number) {
  const start = Date.parse(`${POC_TODAY}T00:00:00Z`);
  const target = Date.parse(`${date}T00:00:00Z`);
  const difference = Math.round((target - start) / 86_400_000);
  return difference >= 0 && difference <= advanceBookingDays;
}

function SeatGlyph({ name }: { name: "search" | "person" | "chair" | "calendar" | "zoom-in" | "zoom-out" | "settings" | "monitor" | "standing" | "close" | "map" | "list" | "reset" }) {
  const paths = {
    search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></>,
    person: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    chair: <><path d="M7 12V6a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v6"/><path d="M5 12h14v5H5zM7 17v4M17 17v4"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4M17 3v4M3 10h18"/></>,
    "zoom-in": <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4M10.5 7.5v6M7.5 10.5h6"/></>,
    "zoom-out": <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4M7.5 10.5h6"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1A8 8 0 0 0 15 6l-.3-2.6h-4L10.4 6a8 8 0 0 0-1.5.9l-2.4-1-2 3.4 2 1.5a7 7 0 0 0 0 2L4.5 14l2 3.5 2.4-1a8 8 0 0 0 1.5.9l.3 2.6h4l.3-2.6a8 8 0 0 0 1.5-.9l2.4 1 2-3.5-2-1.4c.1-.4.1-.8.1-1.2Z"/></>,
    monitor: <><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></>,
    standing: <><path d="M4 9h16M6 9v11M18 9v11M8 14h8"/><path d="M7 5h10l1 4H6z"/></>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
    map: <><path d="m3 6 5-2 8 3 5-2v13l-5 2-8-3-5 2Z"/><path d="M8 4v13M16 7v13"/></>,
    list: <><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/></>,
    reset: <><path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.6"/><path d="M4 4v4.6h4.6"/></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function FloorPicker({ buildingId, selected, seats, policies, reservations, date, onChange }: {
  buildingId: BuildingId;
  selected: FloorId;
  seats: SeatRecord[];
  policies: SeatPolicyRecord[];
  reservations: SeatReservation[];
  date: string;
  onChange: (floor: FloorId) => void;
}) {
  return (
    <div className="floor-picker-wrap">
      <span className="floor-picker-label">층 선택</span>
      <div className="floor-picker" role="tablist" aria-label="층 선택">
        {floorDefinitions.filter((floor) => floor.buildingId === buildingId).map((floor) => {
          const floorSeats = seats.filter((seat) => seat.buildingId === buildingId && seat.floorId === floor.id);
          const totals = getSeatTotals(floorSeats, policies, reservations, date);
          return (
            <button key={floor.id} role="tab" aria-selected={selected === floor.id} className={selected === floor.id ? "selected" : ""} onClick={() => onChange(floor.id)}>
              <b>{floor.id}F</b><small>{totals.available}석 가능</small>
            </button>
          );
        })}
      </div>
    </div>
  );
}

type SeatStatusFilter = "all" | "available" | "assigned";
type SeatModeFilter = "all" | SeatPolicyMode;
type SeatEquipmentFilter = "all" | "dual" | "standing";
type SeatViewMode = "map" | "list";
type WingView = "all" | WingId;

function SeatMap({ buildingId, floorId, seats, policies, reservations, date, selectedSeatId, filter, modeFilter, equipmentFilter, query, onSelect }: {
  buildingId: BuildingId;
  floorId: FloorId;
  seats: SeatRecord[];
  policies: SeatPolicyRecord[];
  reservations: SeatReservation[];
  date: string;
  selectedSeatId?: string;
  filter: SeatStatusFilter;
  modeFilter: SeatModeFilter;
  equipmentFilter: SeatEquipmentFilter;
  query: string;
  onSelect: (seat: SeatRecord) => void;
}) {
  const [zoom, setZoom] = useState(0.46);
  const [viewMode, setViewMode] = useState<SeatViewMode>("map");
  const [wingView, setWingView] = useState<WingView>("all");
  const floor = floorDefinitions.find((item) => item.buildingId === buildingId && item.id === floorId) ?? floorDefinitions[0];
  const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");
  const activeWing: WingView = floor.wings.length === 1 ? "north" : wingView;
  const croppedWing = floor.wings.length > 1 && activeWing !== "all";
  const cropStart = croppedWing && activeWing === "south" ? floor.canvasHeight * 0.45 : 0;
  const cropHeight = croppedWing ? floor.canvasHeight * 0.55 : floor.canvasHeight;
  const canvasStyle = { width: 900 * zoom, height: cropHeight * zoom };
  const innerStyle = { height: floor.canvasHeight, top: -cropStart * zoom, transform: `scale(${zoom})` };

  const policyByZone = useMemo(() => new Map(policies.map((policy) => [policy.zoneId, policy])), [policies]);
  const reservationBySeat = useMemo(() => new Map(
    reservations.filter((reservation) => reservation.date === date).map((reservation) => [reservation.seatId, reservation]),
  ), [reservations, date]);
  const floorSeats = useMemo(() => seats.filter((seat) => seat.buildingId === buildingId && seat.floorId === floorId), [seats, buildingId, floorId]);
  const seatsByZone = useMemo(() => {
    const index = new Map<string, SeatRecord[]>();
    floorSeats.forEach((seat) => index.set(seat.zoneId, [...(index.get(seat.zoneId) ?? []), seat]));
    return index;
  }, [floorSeats]);

  const visibleSeats = useMemo(() => floorSeats.filter((seat) => {
    const policy = policyByZone.get(seat.zoneId) ?? getSeatPolicy(seat, policies);
    const reservation = reservationBySeat.get(seat.id);
    const displayStatus = getDisplayStatus(seat, policy, reservation);
    const matchesQuery = !normalizedQuery || [seat.id, seat.assignedTo, seat.department, reservation?.employee, reservation?.department]
      .filter(Boolean)
      .some((value) => value!.toLocaleLowerCase("ko-KR").includes(normalizedQuery));
    const matchesFilter = filter === "all" || (filter === "available" ? displayStatus === "available" : displayStatus !== "available");
    const matchesMode = modeFilter === "all" || policy.mode === modeFilter;
    const matchesEquipment = equipmentFilter === "all"
      || (equipmentFilter === "dual" && seat.equipment.includes("듀얼 모니터"))
      || (equipmentFilter === "standing" && seat.equipment.includes("높이조절 데스크"));
    const zone = floor.zones.find((item) => item.id === seat.zoneId);
    const matchesWing = activeWing === "all" || zone?.wing === activeWing;
    return matchesQuery && matchesFilter && matchesMode && matchesEquipment && matchesWing;
  }), [floorSeats, policyByZone, policies, reservationBySeat, normalizedQuery, filter, modeFilter, equipmentFilter, floor.zones, activeWing]);
  const visibleSeatIds = useMemo(() => new Set(visibleSeats.map((seat) => seat.id)), [visibleSeats]);

  const changeWing = (next: WingView) => {
    setWingView(next);
    setZoom(next === "all" ? 0.46 : 0.76);
  };

  return (
    <section className="seat-map-section" aria-labelledby="seat-map-title">
      <div className="seat-map-toolbar">
        <div><span className="seat-map-kicker">{date.slice(5).replace("-", ".")} 이용</span><b id="seat-map-title">{floor.label} 좌석도</b><small>{floor.description}</small></div>
        <div className="seat-view-toggle" role="tablist" aria-label="좌석 보기 방식">
          <button role="tab" aria-selected={viewMode === "map"} className={viewMode === "map" ? "selected" : ""} onClick={() => setViewMode("map")}><SeatGlyph name="map" />도면</button>
          <button role="tab" aria-selected={viewMode === "list"} className={viewMode === "list" ? "selected" : ""} onClick={() => setViewMode("list")}><SeatGlyph name="list" />목록</button>
        </div>
      </div>

      <div className="seat-map-context-row">
        {floor.wings.length > 1 ? (
          <div className="map-wing-picker" role="tablist" aria-label="도면 구역 선택">
            {([['all', '전체'], ['north', '북측'], ['south', '남측']] as const).map(([value, label]) => <button key={value} role="tab" aria-selected={activeWing === value} className={activeWing === value ? "selected" : ""} onClick={() => changeWing(value)}>{label}</button>)}
          </div>
        ) : <span className="single-wing-badge">북측 단일 도면</span>}
        {viewMode === "map" && <div className="zoom-controls" aria-label="도면 확대 축소">
          <button aria-label="축소" disabled={zoom <= 0.4} onClick={() => setZoom((value) => Math.max(0.4, value - 0.1))}><SeatGlyph name="zoom-out" /></button>
          <em>{Math.round(zoom * 100)}%</em>
          <button aria-label="확대" disabled={zoom >= 1.1} onClick={() => setZoom((value) => Math.min(1.1, value + 0.1))}><SeatGlyph name="zoom-in" /></button>
        </div>}
      </div>

      <div className="seat-map-tap-guide"><span>{visibleSeats.length}개 좌석 표시</span><small>{viewMode === "map" ? "좌석을 누르면 아래에서 예약할 수 있어요" : "조건에 맞는 좌석을 목록으로 확인하세요"}</small></div>

      {viewMode === "map" ? <div className="seat-map-scroll" tabIndex={0} aria-label={`${floor.label} 좌석 도면, 가로와 세로로 이동할 수 있습니다`}>
        <div className="seat-map-scaled" style={canvasStyle}>
          <div className={`seat-map-canvas floor-map-${floor.id}`} style={innerStyle}>
            <div className="map-north">N</div>
            {floor.wings.length > 1 && <><span className="map-wing-label map-wing-label-north">NORTH · 북측</span><span className="map-wing-label map-wing-label-south">SOUTH · 남측</span></>}
            {floor.rooms.filter((room) => activeWing === "all" || !room.wing || room.wing === activeWing).map((room) => (
              <div
                className={`map-room map-room-${room.kind ?? "room"}`}
                key={`${room.label}-${room.x}`}
                style={{ left: `${room.x}%`, top: `${room.y}%`, width: `${room.width}%`, height: `${room.height}%` }}
              >{room.label}</div>
            ))}
            {floor.zones.filter((zone) => activeWing === "all" || zone.wing === activeWing).map((zone) => {
              const zoneSeats = seatsByZone.get(zone.id) ?? [];
              const zonePolicy = policyByZone.get(zone.id) ?? policies[0];
              if (!zonePolicy) return null;
              return (
                <section
                  className={`map-seat-zone mode-${zonePolicy.mode}`}
                  key={zone.id}
                  style={{ left: `${zone.x}%`, top: `${zone.y}%`, width: `${zone.width}%`, height: `${zone.height}%` }}
                  aria-label={`${zone.label} ${policyModeLabel(zonePolicy.mode)} 좌석 ${zone.count}개`}
                >
                  <span className="zone-name">{zone.label}</span>
                  <em className={`zone-policy-badge mode-${zonePolicy.mode}`}>{policyModeLabel(zonePolicy.mode)}</em>
                  <div className="map-seat-grid" style={{ gridTemplateColumns: `repeat(${zone.columns}, 1fr)` }}>
                    {zoneSeats.map((seat) => {
                      const policy = policyByZone.get(seat.zoneId) ?? getSeatPolicy(seat, policies);
                      const reservation = reservationBySeat.get(seat.id);
                      const displayStatus = getDisplayStatus(seat, policy, reservation);
                      const userLabel = policy.mode === "shared" ? (reservation?.employee ?? seat.assignedTo) : seat.assignedTo;
                      return (
                        <button
                          key={seat.id}
                          className={`map-seat mode-${policy.mode} status-${displayStatus}${policy.mode === "shared" && seat.status === "assigned" ? " transition-assigned" : ""}${seat.id === selectedSeatId ? " selected" : ""}${!visibleSeatIds.has(seat.id) ? " dimmed" : ""}`}
                          onClick={() => onSelect(seat)}
                          title={`${seat.id} · ${policyModeLabel(policy.mode)} · ${statusLabel(displayStatus, policy.mode)}${userLabel ? ` · ${userLabel}` : ""}`}
                          aria-label={`${seat.id}, ${policyModeLabel(policy.mode)}, ${statusLabel(displayStatus, policy.mode)}${userLabel ? `, ${userLabel}` : ""}`}
                        >
                          <span>{String(seat.number).padStart(2, "0")}</span>
                          {seat.equipment.includes("듀얼 모니터") && <i aria-label="듀얼 모니터" />}
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </div> : (
        <div className="seat-list-view" aria-label={`${floor.label} 좌석 목록`}>
          {visibleSeats.length > 0 ? visibleSeats.map((seat) => {
            const policy = policyByZone.get(seat.zoneId) ?? getSeatPolicy(seat, policies);
            const reservation = reservationBySeat.get(seat.id);
            const displayStatus = getDisplayStatus(seat, policy, reservation);
            const userLabel = policy.mode === "shared" ? (reservation?.employee ?? seat.assignedTo) : seat.assignedTo;
            return <button key={seat.id} className={seat.id === selectedSeatId ? "selected" : ""} onClick={() => onSelect(seat)}>
              <span className={`seat-list-symbol status-${displayStatus}`}><SeatGlyph name="chair" /></span>
              <span><b>{seat.id}</b><small>{seat.zoneLabel} · {seat.equipment.join(" · ")}</small>{userLabel && <em>{userLabel} · {statusLabel(displayStatus, policy.mode)}</em>}</span>
              <strong className={`mode-${policy.mode}`}>{policyModeLabel(policy.mode)}</strong>
            </button>;
          }) : <div className="seat-list-empty"><SeatGlyph name="search" /><b>조건에 맞는 좌석이 없어요</b><small>필터를 줄이거나 다른 층을 확인해 보세요.</small></div>}
        </div>
      )}
    </section>
  );
}

function SeatLegend() {
  return (
    <div className="seat-legend" aria-label="좌석 상태 범례">
      <span><i className="legend-available" />선택 가능</span>
      <span><i className="legend-assigned" />사용 중</span>
      <span><i className="legend-pending" />승인 대기</span>
      <span><i className="legend-selected" />선택한 좌석</span>
      <span><i className="legend-fixed" />고정석</span>
      <span><i className="legend-shared" />공유좌석</span>
      <span><i className="legend-dual" />듀얼 모니터</span>
    </div>
  );
}

function SeatSearchAndFilter({ query, onQuery, filter, onFilter, modeFilter, onModeFilter, equipmentFilter, onEquipmentFilter }: {
  query: string;
  onQuery: (value: string) => void;
  filter: SeatStatusFilter;
  onFilter: (value: SeatStatusFilter) => void;
  modeFilter: SeatModeFilter;
  onModeFilter: (value: SeatModeFilter) => void;
  equipmentFilter: SeatEquipmentFilter;
  onEquipmentFilter: (value: SeatEquipmentFilter) => void;
}) {
  const hasFilter = filter !== "all" || modeFilter !== "all" || equipmentFilter !== "all";
  const reset = () => {
    onFilter("all");
    onModeFilter("all");
    onEquipmentFilter("all");
  };

  return (
    <div className="seat-tools">
      <label className="seat-search"><SeatGlyph name="search" /><input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="좌석번호·이름·부서 검색" /></label>
      <div className="seat-quick-filters" aria-label="좌석 빠른 필터">
        <button className={filter === "available" ? "selected" : ""} onClick={() => onFilter(filter === "available" ? "all" : "available")}>이용 가능</button>
        <button className={modeFilter === "fixed" ? "selected" : ""} onClick={() => onModeFilter(modeFilter === "fixed" ? "all" : "fixed")}>고정석</button>
        <button className={modeFilter === "shared" ? "selected" : ""} onClick={() => onModeFilter(modeFilter === "shared" ? "all" : "shared")}>공유좌석</button>
        <button className={equipmentFilter === "dual" ? "selected" : ""} onClick={() => onEquipmentFilter(equipmentFilter === "dual" ? "all" : "dual")}><SeatGlyph name="monitor" />듀얼</button>
        <button className={equipmentFilter === "standing" ? "selected" : ""} onClick={() => onEquipmentFilter(equipmentFilter === "standing" ? "all" : "standing")}><SeatGlyph name="standing" />높이조절</button>
        {hasFilter && <button className="filter-reset" onClick={reset}><SeatGlyph name="reset" />초기화</button>}
      </div>
    </div>
  );
}

function SeatDetail({ seat, policy, reservation, date, admin, onClose, onRequest, onReserveShared, onCancelShared, onOpenAssign, onOpenSharedReserve, onRelease, onStartMove, movingSeat, onMove }: {
  seat: SeatRecord;
  policy: SeatPolicyRecord;
  reservation?: SeatReservation;
  date: string;
  admin?: boolean;
  onClose: () => void;
  onRequest?: (seat: SeatRecord) => void;
  onReserveShared?: (seat: SeatRecord, date: string) => void;
  onCancelShared?: (reservation: SeatReservation) => void;
  onOpenAssign?: (seat: SeatRecord) => void;
  onOpenSharedReserve?: (seat: SeatRecord) => void;
  onRelease?: (seat: SeatRecord) => void;
  onStartMove?: (seat: SeatRecord) => void;
  movingSeat?: SeatRecord;
  onMove?: (from: SeatRecord, to: SeatRecord) => void;
}) {
  const displayStatus = getDisplayStatus(seat, policy, reservation);
  const currentUser = policy.mode === "shared" ? (reservation?.employee ?? seat.assignedTo) : seat.assignedTo;
  const currentDepartment = policy.mode === "shared" ? (reservation?.department ?? seat.department) : seat.department;
  const isMyReservation = reservation?.employee === "본인";

  return (
    <section className="card seat-detail-card" aria-live="polite" aria-label={`${seat.id} 선택 정보`}>
      <div className="seat-sheet-handle" aria-hidden="true" />
      <div className="seat-detail-top">
        <span className={`seat-detail-symbol status-${displayStatus}`}><SeatGlyph name="chair" /></span>
        <div><small>{seat.zoneLabel} · {policyModeLabel(policy.mode)}</small><h3>{seat.id}</h3></div>
        <em className={`seat-state-pill status-${displayStatus}`}>{statusLabel(displayStatus, policy.mode)}</em>
        <button className="seat-detail-close" onClick={onClose} aria-label="선택한 좌석 닫기"><SeatGlyph name="close" /></button>
      </div>
      <div className="seat-feature-chips">
        <span className={`mode-${policy.mode}`}>{policyModeLabel(policy.mode)}</span>
        {policy.mode === "shared" && seat.status === "assigned" && <span>기존 고정배정 유지</span>}
        {seat.equipment.map((equipment) => <span key={equipment}>{equipment === "듀얼 모니터" ? <SeatGlyph name="monitor" /> : equipment === "높이조절 데스크" ? <SeatGlyph name="standing" /> : null}{equipment}</span>)}
      </div>
      <details className="seat-detail-more">
        <summary>좌석 정보 더보기</summary>
        <dl>
          <div><dt>{policy.mode === "shared" ? "예약자" : "현재 사용자"}</dt><dd>{currentUser ?? "없음"}</dd></div>
          <div><dt>소속</dt><dd>{currentDepartment ?? "-"}</dd></div>
          {policy.mode === "shared" && <div><dt>예약일</dt><dd>{date}</dd></div>}
          {seat.effectiveDate && policy.mode === "fixed" && <div><dt>적용일</dt><dd>{seat.effectiveDate}</dd></div>}
        </dl>
      </details>
      {movingSeat && policy.mode === "fixed" && displayStatus === "available" ? (
        <button className="seat-primary-action" onClick={() => onMove?.(movingSeat, seat)}>{movingSeat.assignedTo}님을 이 좌석으로 이동</button>
      ) : admin ? (
        policy.mode === "fixed" ? (
          <div className="seat-admin-actions">
            {displayStatus === "available" && <button className="seat-primary-action" onClick={() => onOpenAssign?.(seat)}>고정좌석 직접 배정</button>}
            {(displayStatus === "assigned" || displayStatus === "reserved") && <button className="seat-primary-action" onClick={() => onStartMove?.(seat)}>좌석 이동</button>}
            {displayStatus !== "available" && displayStatus !== "blocked" && <button className="seat-secondary-action" onClick={() => onRelease?.(seat)}>배정 해제</button>}
          </div>
        ) : (
          <div className="seat-admin-actions">
            {displayStatus === "available" && <button className="seat-primary-action" onClick={() => onOpenSharedReserve?.(seat)}>구성원 대신 예약</button>}
            {seat.status === "assigned" && <button className="seat-primary-action" onClick={() => onRelease?.(seat)}>기존 고정배정 해제</button>}
            {reservation && <button className="seat-secondary-action" onClick={() => onCancelShared?.(reservation)}>공유좌석 예약 취소</button>}
          </div>
        )
      ) : policy.mode === "fixed" ? (
        displayStatus === "available" && policy.fixedApprovalRequired ? (
          <button className="seat-primary-action" onClick={() => onRequest?.(seat)}>고정좌석 신청하기</button>
        ) : displayStatus === "available" ? (
          <p className="seat-detail-notice">관리자가 직접 배정하는 구역이에요.</p>
        ) : displayStatus === "pending" && seat.assignedTo === "본인" ? (
          <p className="seat-detail-notice">관리자 승인을 기다리고 있어요.</p>
        ) : null
      ) : displayStatus === "available" && isWithinAdvanceWindow(date, policy.advanceBookingDays) ? (
        <button className="seat-primary-action" onClick={() => onReserveShared?.(seat, date)}>{date} 예약하기</button>
      ) : displayStatus === "available" ? (
        <p className="seat-detail-notice">이 구역은 {policy.advanceBookingDays === 0 ? "당일만" : `${policy.advanceBookingDays}일 전부터`} 예약할 수 있어요.</p>
      ) : isMyReservation ? (
        <button className="seat-secondary-action" onClick={() => onCancelShared?.(reservation!)}>내 예약 취소</button>
      ) : null}
    </section>
  );
}

export function SeatEmployeeScreen({ seats, policies, reservations, buildingId, onBuildingChange, onRequest, onReserveShared, onCancelShared, onToast }: {
  seats: SeatRecord[];
  policies: SeatPolicyRecord[];
  reservations: SeatReservation[];
  buildingId: BuildingId;
  onBuildingChange: (buildingId: BuildingId) => void;
  onRequest: (seat: SeatRecord) => void;
  onReserveShared: (seat: SeatRecord, date: string) => void;
  onCancelShared: (reservation: SeatReservation) => void;
  onToast: (message: string) => void;
}) {
  const [floorId, setFloorId] = useState<FloorId>("14");
  const [selectedSeatId, setSelectedSeatId] = useState<string>();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SeatStatusFilter>("all");
  const [modeFilter, setModeFilter] = useState<SeatModeFilter>("all");
  const [equipmentFilter, setEquipmentFilter] = useState<SeatEquipmentFilter>("all");
  const [date, setDate] = useState("2026-08-18");
  const buildingSeats = seats.filter((seat) => seat.buildingId === buildingId);
  const selectedSeat = buildingSeats.find((seat) => seat.id === selectedSeatId);
  const selectedPolicy = selectedSeat ? getSeatPolicy(selectedSeat, policies) : undefined;
  const selectedReservation = selectedSeat ? getReservation(selectedSeat, reservations, date) : undefined;
  const mySeat = seats.find((seat) => getSeatPolicy(seat, policies).mode === "fixed" && seat.assignedTo === "본인" && seat.status === "assigned");
  const myReservation = reservations.find((reservation) => reservation.employee === "본인" && reservation.date === date);
  const myReservedSeat = myReservation ? seats.find((seat) => seat.id === myReservation.seatId) : undefined;
  const floorSeats = buildingSeats.filter((seat) => seat.floorId === floorId);
  const floorTotals = getSeatTotals(floorSeats, policies, reservations, date);
  const fixedCount = floorSeats.filter((seat) => getSeatPolicy(seat, policies).mode === "fixed").length;
  const sharedCount = floorSeats.length - fixedCount;

  const changeFloor = (nextFloor: FloorId) => {
    setFloorId(nextFloor);
    setSelectedSeatId(undefined);
  };

  const requestSeat = (seat: SeatRecord) => {
    onRequest(seat);
    onToast(`${seat.id} 고정좌석을 신청했어요.`);
  };

  const reserveShared = (seat: SeatRecord, reservationDate: string) => {
    onReserveShared(seat, reservationDate);
    onToast(`${reservationDate} ${seat.id} 공유좌석을 예약했어요.`);
  };

  const cancelShared = (reservation: SeatReservation) => {
    onCancelShared(reservation);
    onToast("공유좌석 예약을 취소했어요.");
  };

  return (
    <main className={`screen seat-screen${selectedSeat ? " has-seat-selection" : ""}`}>
      <section className="seat-workday-hero">
        <div><p className="eyebrow">WORKPLACE</p><h1>내 자리 찾기</h1><p>건물과 날짜, 층을 선택한 뒤 도면에서 좌석을 확인하세요.</p></div>
        <label><span>이용일</span><input type="date" min="2026-08-18" value={date} onChange={(event) => { setDate(event.target.value); setSelectedSeatId(undefined); }} /></label>
      </section>

      <BuildingPicker value={buildingId} onChange={(building) => { onBuildingChange(building); setSelectedSeatId(undefined); }} />

      {buildingSeats.length === 0 ? <LocationSetupState buildingId={buildingId} /> : <>
        <section className="seat-operation-summary">
          <span><SeatGlyph name="settings" /></span>
          <div><small>{getWorkplaceBuilding(buildingId).shortName} · {floorId}층 운영 정책</small><b>고정석 {fixedCount} · 공유좌석 {sharedCount}</b></div>
          <em>{sharedCount > 0 ? "혼합 운영" : "고정석 운영"}</em>
        </section>

        <div className="my-space-cards">
          {mySeat && (
            <button className="my-seat-card" onClick={() => { onBuildingChange(mySeat.buildingId); setFloorId(mySeat.floorId); setSelectedSeatId(mySeat.id); }}>
              <span><SeatGlyph name="chair" /></span>
              <div><small>현재 내 고정좌석</small><b>{mySeat.id}</b><em>{getWorkplaceBuilding(mySeat.buildingId).shortName} · {mySeat.zoneLabel} · {mySeat.equipment.join(" · ")}</em></div>
              <strong>도면에서 보기</strong>
            </button>
          )}
          {myReservation && myReservedSeat && (
            <button className="my-seat-card shared-reservation-card" onClick={() => { onBuildingChange(myReservedSeat.buildingId); setFloorId(myReservedSeat.floorId); setSelectedSeatId(myReservedSeat.id); }}>
              <span><SeatGlyph name="calendar" /></span>
              <div><small>{date} 공유좌석 예약</small><b>{myReservedSeat.id}</b><em>{getWorkplaceBuilding(myReservedSeat.buildingId).shortName} · {myReservedSeat.zoneLabel} · {myReservation.status === "checked-in" ? "체크인 완료" : "예약 확정"}</em></div>
              <strong>도면에서 보기</strong>
            </button>
          )}
        </div>

        <section className="seat-section-heading">
          <div><p className="eyebrow">FIND A SEAT</p><h2>도면에서 좌석 선택</h2></div>
          <span><b>{floorTotals.available}</b>석 이용 가능</span>
        </section>
        <FloorPicker buildingId={buildingId} selected={floorId} seats={buildingSeats} policies={policies} reservations={reservations} date={date} onChange={changeFloor} />
        <SeatSearchAndFilter query={query} onQuery={setQuery} filter={filter} onFilter={setFilter} modeFilter={modeFilter} onModeFilter={setModeFilter} equipmentFilter={equipmentFilter} onEquipmentFilter={setEquipmentFilter} />
        <SeatLegend />
        <SeatMap key={`${buildingId}-${floorId}`} buildingId={buildingId} floorId={floorId} seats={buildingSeats} policies={policies} reservations={reservations} date={date} selectedSeatId={selectedSeatId} filter={filter} modeFilter={modeFilter} equipmentFilter={equipmentFilter} query={query} onSelect={(seat) => setSelectedSeatId((current) => current === seat.id ? undefined : seat.id)} />

        {selectedSeat && selectedPolicy ? <SeatDetail seat={selectedSeat} policy={selectedPolicy} reservation={selectedReservation} date={date} onClose={() => setSelectedSeatId(undefined)} onRequest={requestSeat} onReserveShared={reserveShared} onCancelShared={cancelShared} /> : (
          <div className="seat-select-guide"><SeatGlyph name="chair" /><span><b>좌석을 선택해 보세요</b><small>구역별 고정석·공유좌석 정책과 장비 정보를 확인할 수 있어요.</small></span></div>
        )}
        <p className="seat-poc-note">POC에서는 화면을 새로 열면 정책과 예약 변경 내용이 초기화됩니다.</p>
      </>}
    </main>
  );
}

type AssignmentPayload = {
  employee: string;
  department: string;
  mode: "assigned" | "reserved";
  effectiveDate: string;
  reason: string;
};

function AssignmentSheet({ seat, onClose, onSubmit }: { seat: SeatRecord; onClose: () => void; onSubmit: (payload: AssignmentPayload) => void }) {
  const [employee, setEmployee] = useState("");
  const [department, setDepartment] = useState("");
  const [mode, setMode] = useState<"assigned" | "reserved">("assigned");
  const [effectiveDate, setEffectiveDate] = useState("2026-08-18");
  const [reason, setReason] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit({ employee, department, mode, effectiveDate, reason });
  };

  return (
    <div className="seat-sheet-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <form className="seat-assignment-sheet" onSubmit={submit} aria-labelledby="assignment-sheet-title">
        <div className="sheet-handle" />
        <div className="assignment-sheet-heading"><div><small>고정석 관리자 배정</small><h2 id="assignment-sheet-title">{seat.id}</h2></div><button type="button" onClick={onClose} aria-label="닫기">×</button></div>
        <label><span>구성원</span><input required value={employee} onChange={(event) => setEmployee(event.target.value)} placeholder="이름 또는 사번 검색" /></label>
        <label><span>소속 부서</span><input required value={department} onChange={(event) => setDepartment(event.target.value)} placeholder="예: Product팀" /></label>
        <fieldset><legend>처리 방식</legend><div className="assignment-mode">
          <label className={mode === "assigned" ? "selected" : ""}><input type="radio" name="mode" checked={mode === "assigned"} onChange={() => setMode("assigned")} /><span><b>즉시 배정</b><small>바로 고정좌석으로 확정</small></span></label>
          <label className={mode === "reserved" ? "selected" : ""}><input type="radio" name="mode" checked={mode === "reserved"} onChange={() => setMode("reserved")} /><span><b>향후 배정</b><small>입사·조직이동일에 적용</small></span></label>
        </div></fieldset>
        <label><span>적용일</span><input required type="date" value={effectiveDate} onChange={(event) => setEffectiveDate(event.target.value)} /></label>
        <label><span>배정 사유</span><textarea required value={reason} onChange={(event) => setReason(event.target.value)} placeholder="신규 입사, 조직 이동 등" /></label>
        <button className="seat-primary-action" type="submit">{mode === "assigned" ? "좌석 배정 확정" : "향후 배정 확정"}</button>
      </form>
    </div>
  );
}

function SharedReservationSheet({ seat, initialDate, onClose, onSubmit }: {
  seat: SeatRecord;
  initialDate: string;
  onClose: () => void;
  onSubmit: (payload: SharedSeatReservationPayload) => void;
}) {
  const [employee, setEmployee] = useState("");
  const [department, setDepartment] = useState("");
  const [date, setDate] = useState(initialDate);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit({ employee, department, date });
  };

  return (
    <div className="seat-sheet-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <form className="seat-assignment-sheet shared-seat-sheet" onSubmit={submit} aria-labelledby="shared-sheet-title">
        <div className="sheet-handle" />
        <div className="assignment-sheet-heading"><div><small>공유좌석 대신 예약</small><h2 id="shared-sheet-title">{seat.id}</h2></div><button type="button" onClick={onClose} aria-label="닫기">×</button></div>
        <label><span>예약 대상자</span><input required value={employee} onChange={(event) => setEmployee(event.target.value)} placeholder="이름 또는 사번 검색" /></label>
        <label><span>소속 부서</span><input required value={department} onChange={(event) => setDepartment(event.target.value)} placeholder="예: Product팀" /></label>
        <label><span>예약일</span><input required type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
        <div className="shared-policy-notice">해당 구역의 예약 가능 기간과 체크인 정책이 자동 적용됩니다.</div>
        <button className="seat-primary-action" type="submit">공유좌석 예약 확정</button>
      </form>
    </div>
  );
}

function SeatPolicyPanel({ buildingId, floorId, policies, onUpdate }: {
  buildingId: BuildingId;
  floorId: FloorId;
  policies: SeatPolicyRecord[];
  onUpdate: (zoneId: string, update: SeatPolicyUpdate) => void;
}) {
  const floor = floorDefinitions.find((item) => item.buildingId === buildingId && item.id === floorId) ?? floorDefinitions[0];
  const floorPolicies = floor.zones.map((zone) => policies.find((policy) => policy.zoneId === zone.id)).filter(Boolean) as SeatPolicyRecord[];

  return (
    <section className="seat-policy-admin-panel">
      <div className="seat-policy-admin-heading">
        <span><SeatGlyph name="settings" /></span>
        <div><small>SEAT POLICY</small><b>{floor.label} 구역별 운영정책</b><em>한 층 안에서도 고정석과 공유좌석을 함께 운영할 수 있습니다.</em></div>
      </div>
      <div className="seat-policy-zone-list">
        {floorPolicies.map((policy) => (
          <article className={`seat-policy-zone-card mode-${policy.mode}`} key={policy.zoneId}>
            <div className="seat-policy-zone-top"><span><b>{policy.zoneLabel}</b><small>{policy.zoneId.toUpperCase()}</small></span><em>{policyModeLabel(policy.mode)}</em></div>
            <div className="seat-policy-mode-toggle" role="group" aria-label={`${policy.zoneLabel} 운영 방식`}>
              <button className={policy.mode === "fixed" ? "selected" : ""} onClick={() => onUpdate(policy.zoneId, { mode: "fixed" })}><b>고정석</b><small>신청·관리자 배정</small></button>
              <button className={policy.mode === "shared" ? "selected" : ""} onClick={() => onUpdate(policy.zoneId, { mode: "shared" })}><b>공유좌석</b><small>빈 좌석부터 예약</small></button>
            </div>
            {policy.mode === "shared" ? (
              <div className="seat-policy-rule-grid">
                <label><span>사전 예약</span><select value={policy.advanceBookingDays} onChange={(event) => onUpdate(policy.zoneId, { advanceBookingDays: Number(event.target.value) })}><option value={0}>당일만</option><option value={7}>7일 전</option><option value={30}>30일 전</option><option value={90}>90일 전</option></select></label>
                <label><span>연속 이용</span><select value={policy.maxConsecutiveDays} onChange={(event) => onUpdate(policy.zoneId, { maxConsecutiveDays: Number(event.target.value) })}><option value={1}>최대 1일</option><option value={3}>최대 3일</option><option value={5}>최대 5일</option></select></label>
                <label><span>체크인</span><select value={policy.checkInRequired ? "required" : "off"} onChange={(event) => onUpdate(policy.zoneId, { checkInRequired: event.target.value === "required" })}><option value="required">필수</option><option value="off">사용 안 함</option></select></label>
                <label><span>자동 해제</span><select disabled={!policy.checkInRequired} value={policy.autoReleaseMinutes} onChange={(event) => onUpdate(policy.zoneId, { autoReleaseMinutes: Number(event.target.value) })}><option value={15}>15분 후</option><option value={30}>30분 후</option><option value={60}>60분 후</option></select></label>
              </div>
            ) : (
              <div className="fixed-policy-copy"><span>배정 정책</span><b>{policy.fixedApprovalRequired ? "구성원 신청 → 관리자 승인" : "관리자 직접 배정"}</b><button onClick={() => onUpdate(policy.zoneId, { fixedApprovalRequired: !policy.fixedApprovalRequired })}>{policy.fixedApprovalRequired ? "직접 배정으로 변경" : "승인 방식으로 변경"}</button></div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

export function SeatAdminScreen({ seats, policies, reservations, buildingId, onBuildingChange, onAssign, onRelease, onMove, onApprove, onUpdatePolicy, onReserveShared, onCancelShared, onToast }: {
  seats: SeatRecord[];
  policies: SeatPolicyRecord[];
  reservations: SeatReservation[];
  buildingId: BuildingId;
  onBuildingChange: (buildingId: BuildingId) => void;
  onAssign: (seat: SeatRecord, payload: AssignmentPayload) => void;
  onRelease: (seat: SeatRecord) => void;
  onMove: (from: SeatRecord, to: SeatRecord) => void;
  onApprove: (seat: SeatRecord) => void;
  onUpdatePolicy: (zoneId: string, update: SeatPolicyUpdate) => void;
  onReserveShared: (seat: SeatRecord, payload: SharedSeatReservationPayload) => void;
  onCancelShared: (reservation: SeatReservation) => void;
  onToast: (message: string) => void;
}) {
  const [floorId, setFloorId] = useState<FloorId>("14");
  const [date, setDate] = useState("2026-08-18");
  const [selectedSeatId, setSelectedSeatId] = useState<string>();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SeatStatusFilter>("all");
  const [modeFilter, setModeFilter] = useState<SeatModeFilter>("all");
  const [equipmentFilter, setEquipmentFilter] = useState<SeatEquipmentFilter>("all");
  const [assignmentSeatId, setAssignmentSeatId] = useState<string>();
  const [sharedReservationSeatId, setSharedReservationSeatId] = useState<string>();
  const [movingSeatId, setMovingSeatId] = useState<string>();
  const buildingSeats = seats.filter((seat) => seat.buildingId === buildingId);
  const totals = getSeatTotals(buildingSeats, policies, reservations, date);
  const fixedCount = buildingSeats.filter((seat) => getSeatPolicy(seat, policies).mode === "fixed").length;
  const sharedCount = buildingSeats.length - fixedCount;
  const selectedSeat = buildingSeats.find((seat) => seat.id === selectedSeatId);
  const selectedPolicy = selectedSeat ? getSeatPolicy(selectedSeat, policies) : undefined;
  const selectedReservation = selectedSeat ? getReservation(selectedSeat, reservations, date) : undefined;
  const assignmentSeat = buildingSeats.find((seat) => seat.id === assignmentSeatId);
  const sharedReservationSeat = buildingSeats.find((seat) => seat.id === sharedReservationSeatId);
  const movingSeat = buildingSeats.find((seat) => seat.id === movingSeatId);
  const buildingSeatIds = new Set(buildingSeats.map((seat) => seat.id));
  const pendingSeats = buildingSeats.filter((seat) => getSeatPolicy(seat, policies).mode === "fixed" && seat.status === "pending");
  const todaySharedReservations = reservations.filter((reservation) => reservation.date === date && buildingSeatIds.has(reservation.seatId)).length;
  const floorSeats = buildingSeats.filter((seat) => seat.floorId === floorId);
  const floorTotals = getSeatTotals(floorSeats, policies, reservations, date);

  const assign = (payload: AssignmentPayload) => {
    if (!assignmentSeat) return;
    onAssign(assignmentSeat, payload);
    setAssignmentSeatId(undefined);
    onToast(payload.mode === "assigned" ? "고정좌석을 직접 배정했어요." : "향후 고정좌석 배정을 등록했어요.");
  };

  const reserveShared = (payload: SharedSeatReservationPayload) => {
    if (!sharedReservationSeat) return;
    onReserveShared(sharedReservationSeat, payload);
    setSharedReservationSeatId(undefined);
    onToast(`${payload.employee}님 대신 공유좌석을 예약했어요.`);
  };

  const move = (from: SeatRecord, to: SeatRecord) => {
    onMove(from, to);
    setMovingSeatId(undefined);
    setSelectedSeatId(to.id);
    onToast(`${from.assignedTo}님의 고정좌석을 ${to.id}로 이동했어요.`);
  };

  return (
    <main className={`screen seat-screen seat-admin-screen${selectedSeat ? " has-seat-selection" : ""}`}>
      <section className="seat-admin-intro">
        <div><p className="eyebrow">SEAT ADMIN</p><h1>좌석 정책·운영 관리</h1><p>구역별 운영방식을 정하고 고정석 배정과 공유좌석 예약을 함께 관리합니다.</p></div>
        <span>POC</span>
      </section>

      <BuildingPicker value={buildingId} label="관리 건물" onChange={(building) => { onBuildingChange(building); setSelectedSeatId(undefined); setAssignmentSeatId(undefined); setSharedReservationSeatId(undefined); setMovingSeatId(undefined); }} />

      {buildingSeats.length === 0 ? <LocationSetupState buildingId={buildingId} admin /> : <>
      <section className="seat-admin-kpis">
        <article><span>전체 좌석</span><b>{totals.total}</b><small>{getWorkplaceBuilding(buildingId).floorLabels.join(" · ")}</small></article>
        <article><span>고정석</span><b>{fixedCount}</b><small>배정·승인 방식</small></article>
        <article><span>공유좌석</span><b>{sharedCount}</b><small>날짜별 예약 방식</small></article>
        <article><span>{date.slice(5).replace("-", "/")} 예약</span><b>{todaySharedReservations}</b><small>공유좌석 예약</small></article>
      </section>

      <section className="seat-admin-floor-control">
        <div><span><SeatGlyph name="calendar" /></span><span><small>운영 기준일</small><b>정책과 예약 현황을 함께 확인</b></span></div>
        <input aria-label="운영 기준일" type="date" value={date} onChange={(event) => { setDate(event.target.value); setSelectedSeatId(undefined); }} />
      </section>

      <FloorPicker buildingId={buildingId} selected={floorId} seats={buildingSeats} policies={policies} reservations={reservations} date={date} onChange={(nextFloor) => { setFloorId(nextFloor); setSelectedSeatId(undefined); }} />
      <SeatPolicyPanel buildingId={buildingId} floorId={floorId} policies={policies} onUpdate={onUpdatePolicy} />

      {pendingSeats.length > 0 && (
        <section className="card seat-approval-queue">
          <div><span><SeatGlyph name="calendar" /></span><div><small>승인 대기</small><b>고정좌석 신청 {pendingSeats.length}건</b></div></div>
          {pendingSeats.slice(0, 2).map((seat) => <button key={seat.id} onClick={() => { onApprove(seat); onToast(`${seat.id} 고정좌석 신청을 승인했어요.`); }}><span><b>{seat.assignedTo}</b><small>{seat.id}</small></span><em>승인</em></button>)}
        </section>
      )}

      {movingSeat && <div className="seat-move-banner"><span><b>{movingSeat.assignedTo}님 고정좌석 이동 중</b><small>도면에서 이동할 빈 고정석을 선택하세요.</small></span><button onClick={() => setMovingSeatId(undefined)}>취소</button></div>}

      <section className="seat-section-heading admin-map-heading">
        <div><p className="eyebrow">FLOOR CONTROL</p><h2>도면에서 직접 관리</h2></div>
        <span><b>{floorTotals.available}</b>석 이용 가능</span>
      </section>
      <SeatSearchAndFilter query={query} onQuery={setQuery} filter={filter} onFilter={setFilter} modeFilter={modeFilter} onModeFilter={setModeFilter} equipmentFilter={equipmentFilter} onEquipmentFilter={setEquipmentFilter} />
      <SeatLegend />
      <SeatMap key={`${buildingId}-${floorId}`} buildingId={buildingId} floorId={floorId} seats={buildingSeats} policies={policies} reservations={reservations} date={date} selectedSeatId={selectedSeatId} filter={filter} modeFilter={modeFilter} equipmentFilter={equipmentFilter} query={query} onSelect={(seat) => setSelectedSeatId((current) => current === seat.id ? undefined : seat.id)} />

      {selectedSeat && selectedPolicy ? (
        <SeatDetail
          seat={selectedSeat}
          policy={selectedPolicy}
          reservation={selectedReservation}
          date={date}
          admin
          onClose={() => setSelectedSeatId(undefined)}
          movingSeat={movingSeat}
          onMove={move}
          onOpenAssign={(seat) => setAssignmentSeatId(seat.id)}
          onOpenSharedReserve={(seat) => setSharedReservationSeatId(seat.id)}
          onRelease={(seat) => { onRelease(seat); onToast(`${seat.id} 고정석 배정을 해제했어요.`); }}
          onCancelShared={(reservation) => { onCancelShared(reservation); onToast("공유좌석 예약을 취소했어요."); }}
          onStartMove={(seat) => { setMovingSeatId(seat.id); onToast("이동할 빈 고정석을 선택하세요."); }}
        />
      ) : <div className="seat-select-guide"><SeatGlyph name="person" /><span><b>관리할 좌석을 선택하세요</b><small>고정석은 배정·이동하고 공유좌석은 구성원 대신 예약할 수 있어요.</small></span></div>}

      <section className="seat-admin-footnote"><b>실제 연동 시</b><span>Okta·인사정보·조직별 이용권한·출입 체크인·변경 이력을 정책 엔진과 연결합니다.</span></section>
      </>}
      {assignmentSeat && <AssignmentSheet seat={assignmentSeat} onClose={() => setAssignmentSeatId(undefined)} onSubmit={assign} />}
      {sharedReservationSeat && <SharedReservationSheet seat={sharedReservationSeat} initialDate={date} onClose={() => setSharedReservationSeatId(undefined)} onSubmit={reserveShared} />}
    </main>
  );
}

export function floorSummary(seats: SeatRecord[], policies?: SeatPolicyRecord[], reservations: SeatReservation[] = []) {
  return floorDefinitions.map((floor) => ({
    floor: floor.label,
    ...getSeatTotals(seats.filter((seat) => seat.floorId === floor.id), policies, reservations),
  }));
}

function SpaceResourceTabs({ value, onChange, admin }: { value: "seat" | "room"; onChange: (value: "seat" | "room") => void; admin?: boolean }) {
  return <div className="space-resource-tabs" role="tablist" aria-label={admin ? "공간 관리 유형" : "공간 예약 유형"}>
    <button role="tab" aria-selected={value === "seat"} className={value === "seat" ? "selected" : ""} onClick={() => onChange("seat")}><b>좌석</b><small>{admin ? "정책·배정·예약" : "고정석 신청·공유좌석 예약"}</small></button>
    <button role="tab" aria-selected={value === "room"} className={value === "room" ? "selected" : ""} onClick={() => onChange("room")}><b>회의실</b><small>{admin ? "예약·일정·정책" : "시간·인원별 예약"}</small></button>
  </div>;
}

export function SpaceEmployeeScreen({ seats, policies, reservations, rooms, onRequest, onReserveShared, onCancelShared, onBookRoom, onToast }: {
  seats: SeatRecord[];
  policies: SeatPolicyRecord[];
  reservations: SeatReservation[];
  rooms: RoomRecord[];
  onRequest: (seat: SeatRecord) => void;
  onReserveShared: (seat: SeatRecord, date: string) => void;
  onCancelShared: (reservation: SeatReservation) => void;
  onBookRoom: (room: RoomRecord, payload: RoomBookingPayload) => void;
  onToast: (message: string) => void;
}) {
  const [resource, setResource] = useState<"seat" | "room">("seat");
  const [buildingId, setBuildingId] = useState<BuildingId>("pangyo");
  return <>
    <SpaceResourceTabs value={resource} onChange={setResource} />
    {resource === "seat" ? <SeatEmployeeScreen seats={seats} policies={policies} reservations={reservations} buildingId={buildingId} onBuildingChange={setBuildingId} onRequest={onRequest} onReserveShared={onReserveShared} onCancelShared={onCancelShared} onToast={onToast} /> : <main className="screen seat-screen room-screen"><RoomEmployeePanel rooms={rooms} buildingId={buildingId} onBuildingChange={setBuildingId} onBook={onBookRoom} onToast={onToast} /></main>}
  </>;
}

export function SpaceAdminScreen({ seats, policies, reservations, rooms, onAssign, onRelease, onMove, onApprove, onUpdatePolicy, onReserveShared, onCancelShared, onBookRoom, onToast }: {
  seats: SeatRecord[];
  policies: SeatPolicyRecord[];
  reservations: SeatReservation[];
  rooms: RoomRecord[];
  onAssign: (seat: SeatRecord, payload: AssignmentPayload) => void;
  onRelease: (seat: SeatRecord) => void;
  onMove: (from: SeatRecord, to: SeatRecord) => void;
  onApprove: (seat: SeatRecord) => void;
  onUpdatePolicy: (zoneId: string, update: SeatPolicyUpdate) => void;
  onReserveShared: (seat: SeatRecord, payload: SharedSeatReservationPayload) => void;
  onCancelShared: (reservation: SeatReservation) => void;
  onBookRoom: (room: RoomRecord, payload: RoomBookingPayload) => void;
  onToast: (message: string) => void;
}) {
  const [resource, setResource] = useState<"seat" | "room">("seat");
  const [buildingId, setBuildingId] = useState<BuildingId>("pangyo");
  return <>
    <SpaceResourceTabs value={resource} onChange={setResource} admin />
    {resource === "seat" ? <SeatAdminScreen seats={seats} policies={policies} reservations={reservations} buildingId={buildingId} onBuildingChange={setBuildingId} onAssign={onAssign} onRelease={onRelease} onMove={onMove} onApprove={onApprove} onUpdatePolicy={onUpdatePolicy} onReserveShared={onReserveShared} onCancelShared={onCancelShared} onToast={onToast} /> : <main className="screen seat-screen seat-admin-screen room-admin-screen"><RoomAdminPanel rooms={rooms} buildingId={buildingId} onBuildingChange={setBuildingId} onBook={onBookRoom} onToast={onToast} /></main>}
  </>;
}
