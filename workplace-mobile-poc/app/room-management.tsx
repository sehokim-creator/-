"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { FloorId } from "./seat-management";
import { BuildingPicker, getWorkplaceBuilding, LocationSetupState } from "./workplace-locations";
import type { BuildingId } from "./workplace-locations";

export type RoomBooking = {
  id: string;
  organizer: string;
  department: string;
  title: string;
  date: string;
  start: string;
  end: string;
  status: "confirmed" | "pending";
};

export type RoomRecord = {
  id: string;
  buildingId: BuildingId;
  floorId: FloorId;
  name: string;
  capacity: number;
  equipment: string[];
  approvalRequired?: boolean;
  bookings: RoomBooking[];
};

export type RoomBookingPayload = {
  organizer: string;
  department: string;
  title: string;
  date: string;
  start: string;
  duration: number;
  status: "confirmed" | "pending";
};

const floors: Array<{ id: FloorId; label: string }> = [
  { id: "3", label: "3층" },
  { id: "14", label: "14층" },
  { id: "15", label: "15층" },
  { id: "17", label: "17층" },
];

const roomSeeds: Array<{ floorId: FloorId; rooms: number[] }> = [
  { floorId: "3", rooms: [1, 2] },
  { floorId: "14", rooms: [1, 2, 3, 4, 5, 6] },
  { floorId: "15", rooms: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] },
  { floorId: "17", rooms: [1, 2, 3, 4] },
];

function addMinutes(time: string, minutes: number) {
  const [hour, minute] = time.split(":").map(Number);
  const total = hour * 60 + minute + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function toMinutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function overlaps(startA: string, endA: string, startB: string, endB: string) {
  return toMinutes(startA) < toMinutes(endB) && toMinutes(endA) > toMinutes(startB);
}

export function createInitialRooms(): RoomRecord[] {
  let roomIndex = 0;
  return roomSeeds.flatMap(({ floorId, rooms }) => rooms.map((roomNumber) => {
    const index = roomIndex++;
    const name = `${floorId}.${roomNumber} 회의실`;
    const capacity = [4, 6, 8, 10, 12, 16][index % 6];
    const bookings: RoomBooking[] = [];
    if (index % 3 === 0) bookings.push({ id: `B-${index}-1`, organizer: "김세호", department: "Product", title: "주간 업무회의", date: "2026-08-18", start: "14:00", end: "14:30", status: "confirmed" });
    if (index % 4 === 0) bookings.push({ id: `B-${index}-2`, organizer: "박서연", department: "Engineering", title: "프로젝트 리뷰", date: "2026-08-18", start: "16:00", end: "17:00", status: "confirmed" });
    return {
      id: `ROOM-${floorId}-${String(roomNumber).padStart(2, "0")}`,
      buildingId: "pangyo",
      floorId,
      name,
      capacity,
      equipment: ["화상회의", "디스플레이", ...(index % 2 === 0 ? ["화이트보드"] : [])],
      approvalRequired: capacity >= 16,
      bookings,
    };
  }));
}

export function roomAvailability(room: RoomRecord, date: string, start: string, duration: number) {
  const end = addMinutes(start, duration);
  return room.bookings.some((booking) => booking.date === date && overlaps(start, end, booking.start, booking.end)) ? "occupied" : "available";
}

export function getRoomStats(rooms: RoomRecord[], date = "2026-08-18", start = "14:00", duration = 30) {
  const bookings = rooms.flatMap((room) => room.bookings.filter((booking) => booking.date === date));
  return {
    total: rooms.length,
    available: rooms.filter((room) => roomAvailability(room, date, start, duration) === "available").length,
    bookings: bookings.length,
    pending: bookings.filter((booking) => booking.status === "pending").length,
  };
}

function RoomIcon({ name }: { name: "room" | "people" | "screen" | "calendar" | "clock" | "settings" }) {
  const content = {
    room: <><path d="M4 21V4h12v17M4 21h16M9 12h.01"/><path d="M16 8h4v13"/></>,
    people: <><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M16 11a3 3 0 0 1 5 2.2M17 20a5 5 0 0 1 4-4.9"/></>,
    screen: <><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4M17 3v4M3 10h18"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>,
  }[name];
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{content}</svg>;
}

function RoomFloorPicker({ value, onChange }: { value: FloorId; onChange: (floor: FloorId) => void }) {
  return <div className="room-floor-picker" role="tablist" aria-label="회의실 층 선택">{floors.map((floor) => <button role="tab" aria-selected={value === floor.id} className={value === floor.id ? "selected" : ""} key={floor.id} onClick={() => onChange(floor.id)}>{floor.label}</button>)}</div>;
}

function RoomBookingSheet({ room, admin, initialDate, initialStart, initialDuration, onClose, onSubmit }: {
  room: RoomRecord;
  admin?: boolean;
  initialDate: string;
  initialStart: string;
  initialDuration: number;
  onClose: () => void;
  onSubmit: (payload: RoomBookingPayload) => void;
}) {
  const [organizer, setOrganizer] = useState(admin ? "" : "본인");
  const [department, setDepartment] = useState(admin ? "" : "내 소속팀");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(initialDate);
  const [start, setStart] = useState(initialStart);
  const [duration, setDuration] = useState(initialDuration);
  const available = roomAvailability(room, date, start, duration) === "available";

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!available) return;
    onSubmit({ organizer, department, title, date, start, duration, status: room.approvalRequired ? "pending" : "confirmed" });
  };

  return <div className="room-sheet-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
    <form className="room-booking-sheet" onSubmit={submit}>
      <div className="room-sheet-handle" />
      <div className="room-sheet-title"><div><small>{admin ? "관리자 대신 예약" : "회의실 예약"}</small><h2>{room.name}</h2></div><button type="button" onClick={onClose} aria-label="닫기">×</button></div>
      {admin && <><label><span>예약 대상자</span><input required value={organizer} onChange={(event) => setOrganizer(event.target.value)} placeholder="이름 또는 사번" /></label><label><span>소속 부서</span><input required value={department} onChange={(event) => setDepartment(event.target.value)} placeholder="예: Product팀" /></label></>}
      <label><span>회의 제목</span><input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="예: 주간 업무회의" /></label>
      <div className="room-sheet-grid"><label><span>날짜</span><input type="date" required value={date} onChange={(event) => setDate(event.target.value)} /></label><label><span>시작</span><input type="time" step="900" required value={start} onChange={(event) => setStart(event.target.value)} /></label></div>
      <label><span>사용 시간</span><select value={duration} onChange={(event) => setDuration(Number(event.target.value))}><option value={30}>30분</option><option value={60}>1시간</option><option value={90}>1시간 30분</option><option value={120}>2시간</option></select></label>
      <div className={`room-sheet-availability ${available ? "available" : "occupied"}`}>{available ? `${start}~${addMinutes(start, duration)} 예약 가능` : "해당 시간에는 이미 예약이 있습니다."}</div>
      {room.approvalRequired && <p className="room-approval-note">16인 이상 회의실은 공간관리자 승인 후 확정됩니다.</p>}
      <button className="room-primary-button" disabled={!available} type="submit">{room.approvalRequired ? "예약 승인 요청" : "예약 확정"}</button>
    </form>
  </div>;
}

function RoomCard({ room, date, start, duration, selected, onClick }: { room: RoomRecord; date: string; start: string; duration: number; selected: boolean; onClick: () => void }) {
  const availability = roomAvailability(room, date, start, duration);
  const nextBookings = room.bookings.filter((booking) => booking.date === date).sort((a, b) => a.start.localeCompare(b.start)).slice(0, 2);
  return <button className={`room-card${selected ? " selected" : ""}`} onClick={onClick}>
    <div className="room-card-top"><span className="room-card-icon"><RoomIcon name="room" /></span><span><small>{getWorkplaceBuilding(room.buildingId).shortName} · {room.floorId}층</small><b>{room.name}</b></span><em className={availability}>{availability === "available" ? "예약 가능" : "사용 중"}</em></div>
    <div className="room-card-meta"><span><RoomIcon name="people" />{room.capacity}명</span><span><RoomIcon name="screen" />{room.equipment.slice(0, 2).join(" · ")}</span></div>
    <div className="room-schedule-preview">{nextBookings.length ? nextBookings.map((booking) => <span key={booking.id}><b>{booking.start}</b>{booking.title}</span>) : <span className="empty">오늘 등록된 예약이 없습니다.</span>}</div>
  </button>;
}

export function RoomEmployeePanel({ rooms, buildingId, onBuildingChange, onBook, onToast }: { rooms: RoomRecord[]; buildingId: BuildingId; onBuildingChange: (buildingId: BuildingId) => void; onBook: (room: RoomRecord, payload: RoomBookingPayload) => void; onToast: (message: string) => void }) {
  const [floorId, setFloorId] = useState<FloorId>("15");
  const [scope, setScope] = useState<"floor" | "building">("floor");
  const [availableOnly, setAvailableOnly] = useState(true);
  const [date, setDate] = useState("2026-08-18");
  const [start, setStart] = useState("14:00");
  const [duration, setDuration] = useState(30);
  const [capacity, setCapacity] = useState(0);
  const [selectedRoomId, setSelectedRoomId] = useState<string>();
  const [bookingRoomId, setBookingRoomId] = useState<string>();
  const buildingRooms = useMemo(() => rooms.filter((room) => room.buildingId === buildingId), [rooms, buildingId]);
  const scopedRooms = useMemo(() => buildingRooms.filter((room) => scope === "building" || room.floorId === floorId), [buildingRooms, scope, floorId]);
  const visibleRooms = useMemo(() => scopedRooms
    .filter((room) => room.capacity >= capacity)
    .filter((room) => !availableOnly || roomAvailability(room, date, start, duration) === "available"), [scopedRooms, capacity, availableOnly, date, start, duration]);
  const selectedRoom = buildingRooms.find((room) => room.id === selectedRoomId);
  const bookingRoom = buildingRooms.find((room) => room.id === bookingRoomId);
  const floorLabel = floors.find((floor) => floor.id === floorId)?.label ?? "";

  return <>
    <section className="room-intro room-finder-intro"><h1>회의실 찾기</h1><p>시간과 인원을 고르면 예약 가능한 공간을 바로 확인할 수 있어요.</p></section>
    <BuildingPicker value={buildingId} onChange={(building) => { onBuildingChange(building); setSelectedRoomId(undefined); setBookingRoomId(undefined); }} />
    {buildingRooms.length === 0 ? <LocationSetupState buildingId={buildingId} /> : <>
      <section className="room-booking-bar"><label><span>날짜</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label><span>시작</span><input type="time" step="900" value={start} onChange={(event) => setStart(event.target.value)} /></label><label><span>시간</span><select value={duration} onChange={(event) => setDuration(Number(event.target.value))}><option value={30}>30분</option><option value={60}>1시간</option><option value={90}>90분</option></select></label></section>
      <section className="room-scope-bar">
        <div className="room-scope-toggle">
          <span className="room-scope-label">검색 범위</span>
          <div className="segment-control" role="tablist" aria-label="검색 범위">
            <button type="button" role="tab" aria-selected={scope === "floor"} className={scope === "floor" ? "selected" : ""} onClick={() => setScope("floor")}>선택 층</button>
            <button type="button" role="tab" aria-selected={scope === "building"} className={scope === "building" ? "selected" : ""} onClick={() => setScope("building")}>건물 전체</button>
          </div>
        </div>
        <label className="room-available-switch">
          <span><b>예약 가능만</b><small>선택 시간 기준</small></span>
          <input type="checkbox" role="switch" checked={availableOnly} onChange={(event) => setAvailableOnly(event.target.checked)} />
          <span className="room-switch-track" aria-hidden="true" />
        </label>
      </section>
      <section className="room-section-heading"><div><p className="eyebrow">{scope === "floor" ? floorLabel : "전체 층"}</p><h2>예약 가능한 회의실</h2></div><span><b>{visibleRooms.length}</b>개 표시</span></section>
      {scope === "floor" && <RoomFloorPicker value={floorId} onChange={(floor) => { setFloorId(floor); setSelectedRoomId(undefined); }} />}
      <div className="room-capacity-filter"><button className={capacity === 0 ? "selected" : ""} onClick={() => setCapacity(0)}>전체</button><button className={capacity === 6 ? "selected" : ""} onClick={() => setCapacity(6)}>6명+</button><button className={capacity === 10 ? "selected" : ""} onClick={() => setCapacity(10)}>10명+</button><button className={capacity === 16 ? "selected" : ""} onClick={() => setCapacity(16)}>16명+</button></div>
      <div className="room-list">{visibleRooms.map((room) => <RoomCard key={room.id} room={room} date={date} start={start} duration={duration} selected={selectedRoomId === room.id} onClick={() => setSelectedRoomId(room.id)} />)}</div>
      {selectedRoom && <section className="room-selected-card"><div><span><RoomIcon name="room" /></span><div><small>선택한 회의실</small><b>{selectedRoom.name}</b><em>{selectedRoom.capacity}명 · {selectedRoom.equipment.join(" · ")}</em></div></div><button disabled={roomAvailability(selectedRoom, date, start, duration) !== "available"} onClick={() => setBookingRoomId(selectedRoom.id)}>{roomAvailability(selectedRoom, date, start, duration) === "available" ? `${start} 예약하기` : "다른 시간 선택"}</button></section>}
      <p className="room-checkin-note">예약 15분 전부터 체크인할 수 있으며, 미체크인 예약은 실제 운영 시 자동 해제할 수 있습니다.</p>
    </>}
    {bookingRoom && <RoomBookingSheet room={bookingRoom} initialDate={date} initialStart={start} initialDuration={duration} onClose={() => setBookingRoomId(undefined)} onSubmit={(payload) => { onBook(bookingRoom, payload); setBookingRoomId(undefined); onToast(bookingRoom.approvalRequired ? "회의실 예약 승인을 요청했어요." : "회의실 예약이 확정됐어요."); }} />}
  </>;
}

export function RoomAdminPanel({ rooms, buildingId, onBuildingChange, onBook, onToast }: { rooms: RoomRecord[]; buildingId: BuildingId; onBuildingChange: (buildingId: BuildingId) => void; onBook: (room: RoomRecord, payload: RoomBookingPayload) => void; onToast: (message: string) => void }) {
  const [floorId, setFloorId] = useState<FloorId>("15");
  const [selectedRoomId, setSelectedRoomId] = useState<string>();
  const [bookingRoomId, setBookingRoomId] = useState<string>();
  const date = "2026-08-18";
  const start = "14:00";
  const duration = 30;
  const buildingRooms = rooms.filter((room) => room.buildingId === buildingId);
  const stats = getRoomStats(buildingRooms, date, start, duration);
  const floorRooms = buildingRooms.filter((room) => room.floorId === floorId);
  const bookingRoom = buildingRooms.find((room) => room.id === bookingRoomId);
  const floorCount = new Set(buildingRooms.map((room) => room.floorId)).size;

  return <>
    <BuildingPicker value={buildingId} label="관리 건물" onChange={(building) => { onBuildingChange(building); setSelectedRoomId(undefined); setBookingRoomId(undefined); }} />
    {buildingRooms.length === 0 ? <LocationSetupState buildingId={buildingId} admin /> : <>
      <section className="room-admin-summary"><article><span>전체 회의실</span><b>{stats.total}</b><small>{floorCount}개 층</small></article><article><span>지금 예약 가능</span><b>{stats.available}</b><small>14:00 기준</small></article><article><span>오늘 예약</span><b>{stats.bookings}</b><small>확정·승인대기</small></article><article><span>승인 대기</span><b>{stats.pending}</b><small>제한 회의실</small></article></section>
      <section className="room-admin-policy"><span><RoomIcon name="settings" /></span><div><small>BOOKING POLICY</small><b>회의실 예약 정책</b><em>15분 단위 · 최대 2시간 · 30일 전부터 예약 · 미체크인 자동 해제</em></div><button>설정</button></section>
      <section className="room-section-heading admin"><div><h2>예약·일정 관리</h2></div><span>관리자 대신 예약 가능</span></section>
      <RoomFloorPicker value={floorId} onChange={(floor) => { setFloorId(floor); setSelectedRoomId(undefined); }} />
      <div className="room-list admin">{floorRooms.map((room) => <div key={room.id} className="room-admin-row"><RoomCard room={room} date={date} start={start} duration={duration} selected={selectedRoomId === room.id} onClick={() => setSelectedRoomId(room.id)} /><button className="room-admin-action" onClick={() => setBookingRoomId(room.id)}>구성원 대신 예약</button></div>)}</div>
      <section className="room-admin-map-note"><RoomIcon name="room" /><span><b>도면과 회의실을 함께 관리</b><small>실제 운영에서는 도면 위 회의실 위치·수용인원·장비·예약 제한을 관리자 화면에서 편집합니다.</small></span></section>
    </>}
    {bookingRoom && <RoomBookingSheet room={bookingRoom} admin initialDate={date} initialStart={start} initialDuration={duration} onClose={() => setBookingRoomId(undefined)} onSubmit={(payload) => { onBook(bookingRoom, payload); setBookingRoomId(undefined); onToast(`${payload.organizer}님 대신 ${bookingRoom.name}을 예약했어요.`); }} />}
  </>;
}
