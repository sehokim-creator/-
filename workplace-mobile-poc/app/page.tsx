"use client";

import { useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { createIntegrationEnvelope } from "../lib/integration-contract";
import type { IntegrationEnvelope } from "../lib/integration-contract";
import {
  createInitialSeatPolicies,
  createInitialSeatReservations,
  createInitialSeats,
  getSeatTotals,
  SpaceAdminScreen,
  SpaceEmployeeScreen,
} from "./seat-management";
import type {
  SeatPolicyRecord,
  SeatPolicyUpdate,
  SeatRecord,
  SeatReservation,
  SharedSeatReservationPayload,
} from "./seat-management";
import { createInitialRooms, getRoomStats } from "./room-management";
import type { RoomBookingPayload, RoomRecord } from "./room-management";
import { BudgetAdminScreen } from "./budget-management";
import { getWorkplaceBuilding } from "./workplace-locations";

type Tab = "home" | "request" | "seat" | "mine" | "ops" | "seatAdmin" | "budgetAdmin";
type NavigationTab = Exclude<Tab, "seatAdmin" | "budgetAdmin">;
type Status = "접수" | "처리 중" | "완료";
type Priority = "일반" | "긴급";

type RequestItem = {
  id: string;
  category: string;
  categoryCode?: string;
  serviceItem?: string;
  serviceItemId?: string;
  title: string;
  status: Status;
  location: string;
  assignee: string;
  updated: string;
  priority: Priority;
  created: string;
  description: string;
  sla: string;
  route?: string;
  approval?: string;
  details?: Array<{ key?: string; label: string; value: string }>;
  integration?: IntegrationEnvelope;
};

type FieldValue = string | boolean | string[];
type FormValues = Record<string, FieldValue>;
type FieldKind = "text" | "number" | "date" | "time" | "select" | "textarea" | "checkbox" | "multi";

type CatalogField = {
  key: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  placeholder?: string;
  help?: string;
  options?: string[];
  min?: number;
  max?: number;
  validation?: "vehicle" | "asset";
  showWhen?: { key: string; value: string };
  allowOther?: boolean;
  otherPlaceholder?: string;
};

type RequestTypeDefinition = {
  id: string;
  label: string;
  description: string;
  fields: CatalogField[];
  workflow: {
    route: string;
    approval: string;
    sla: string;
    notice: string;
  };
  defaultPriority?: Priority;
  primaryField?: string;
};

type IconName =
  | "home"
  | "plus"
  | "list"
  | "chart"
  | "bell"
  | "chevron"
  | "building"
  | "monitor"
  | "badge"
  | "package"
  | "car"
  | "chair"
  | "search"
  | "clock"
  | "check"
  | "camera"
  | "arrow"
  | "user"
  | "pin"
  | "alert"
  | "sparkle";

type ServiceDefinition = {
  id: string;
  label: string;
  description: string;
  icon: IconName;
  tone: string;
  requestTypes: RequestTypeDefinition[];
  otherRoute: string;
  detailLocationRequired: boolean;
  detailLocationPlaceholder: string;
};

const OTHER_OPTION = "기타 (직접 입력)";
const deviceOptions = ["Windows 노트북", "MacBook Air", "Windows 데스크탑", "모니터", "iPad·태블릿", "주변기기", OTHER_OPTION];
const operatingSystemOptions = ["Windows 11", "macOS", "iOS·iPadOS", "복수 운영체제", "해당 없음", OTHER_OPTION];

const services: ServiceDefinition[] = [
  {
    id: "FACILITIES",
    label: "시설·환경",
    description: "냉난방, 청소, 수리",
    icon: "building",
    tone: "blue",
    otherRoute: "시설 운영팀",
    detailLocationRequired: true,
    detailLocationPlaceholder: "층·좌석·회의실 등 정확한 위치",
    requestTypes: [
      {
        id: "facility-repair",
        label: "시설 고장·수리",
        description: "조명, 문, 가구, 누수 등 시설 이상",
        primaryField: "issue_type",
        fields: [
          { key: "issue_type", label: "고장 유형", kind: "select", required: true, options: ["전기·조명", "문·잠금장치", "가구·집기", "누수·배관", "벽·바닥·천장", "기타"] },
          { key: "symptom", label: "현재 증상", kind: "textarea", required: true, placeholder: "발생 시점과 현재 상태를 구체적으로 적어주세요" },
          { key: "available_time", label: "방문 가능 시간", kind: "select", required: true, options: ["업무시간 중 언제든 가능", "오전 09:00~12:00", "오후 13:00~18:00", "별도 협의 필요"] },
          { key: "safety_risk", label: "사람이나 장비에 즉시 위험이 있어요", kind: "checkbox", help: "선택하면 긴급 요청으로 우선 분류됩니다." },
        ],
        workflow: { route: "시설 운영팀", approval: "승인 없음", sla: "4시간 이내 1차 확인", notice: "위치와 증상을 기준으로 담당 기사 또는 협력사에 자동 배정합니다." },
      },
      {
        id: "facility-hvac",
        label: "냉난방·공조",
        description: "온도, 소음, 냄새, 환기 문제",
        primaryField: "hvac_issue",
        fields: [
          { key: "hvac_issue", label: "문제 유형", kind: "select", required: true, options: ["너무 더움", "너무 추움", "냉난방 미작동", "이상 소음", "이상 냄새", "환기 불량"], allowOther: true },
          { key: "affected_area", label: "영향 범위", kind: "select", required: true, options: ["좌석 1~2개", "팀 좌석 전체", "회의실 1개", "층 전체", "공용공간"] },
          { key: "current_temp", label: "현재 온도", kind: "number", placeholder: "예: 28", min: 10, max: 40, help: "확인 가능한 경우에만 입력해 주세요." },
          { key: "started_at", label: "문제 발생 시점", kind: "text", required: true, placeholder: "예: 오늘 오전 10시부터" },
        ],
        workflow: { route: "시설 운영팀 · 공조 협력사", approval: "승인 없음", sla: "2시간 이내 1차 확인", notice: "영향 범위가 층 전체인 경우 우선순위를 자동 상향합니다." },
      },
      {
        id: "facility-cleaning",
        label: "청소·환경",
        description: "오염, 폐기물, 해충, 위생 요청",
        primaryField: "cleaning_type",
        fields: [
          { key: "cleaning_type", label: "요청 유형", kind: "select", required: true, options: ["오염물 청소", "폐기물 수거", "화장실·탕비실", "해충 발견", "냄새·위생", "정기청소 개선"], allowOther: true },
          { key: "scope", label: "범위·수량", kind: "text", required: true, placeholder: "예: 회의실 바닥 약 2㎡, 박스 5개" },
          { key: "complete_by", label: "희망 완료 시각", kind: "text", required: true, placeholder: "예: 오늘 15시 전" },
          { key: "biohazard", label: "유리·액체 등 위험물질이 포함돼요", kind: "checkbox" },
        ],
        workflow: { route: "미화 운영팀", approval: "승인 없음", sla: "4시간 이내 처리", notice: "위험물질을 선택하면 안전 담당자에게도 동시에 알립니다." },
      },
      {
        id: "facility-safety",
        label: "안전·긴급 조치",
        description: "파손, 누전, 미끄럼 등 즉시 조치",
        defaultPriority: "긴급",
        primaryField: "hazard_type",
        fields: [
          { key: "hazard_type", label: "위험 유형", kind: "select", required: true, options: ["누전·감전 위험", "낙하·파손 위험", "미끄럼·넘어짐", "화재·연기·탄 냄새", "침수·대량 누수", "기타 안전 위험"] },
          { key: "people_affected", label: "현재 영향 인원", kind: "number", required: true, min: 0, max: 999 },
          { key: "immediate_action", label: "현재 취한 조치", kind: "textarea", required: true, placeholder: "출입 통제, 전원 차단 등 현재 조치를 적어주세요" },
          { key: "area_blocked", label: "주변 출입을 통제했어요", kind: "checkbox" },
        ],
        workflow: { route: "시설 안전 담당 · 보안센터", approval: "승인 없음", sla: "30분 이내 현장 확인", notice: "등록 즉시 긴급 알림을 보내고 일반 요청보다 우선 배정합니다." },
      },
    ],
  },
  {
    id: "OA_IT",
    label: "OA·IT",
    description: "PC, 모니터, 장비",
    icon: "monitor",
    tone: "violet",
    otherRoute: "OA 서비스데스크",
    detailLocationRequired: true,
    detailLocationPlaceholder: "층·좌석번호 또는 수령 장소",
    requestTypes: [
      {
        id: "oa-purchase",
        label: "신규 지급·구매",
        description: "신규 입사, 추가 지급, 새 장비 구매",
        primaryField: "asset_type",
        fields: [
          { key: "request_reason", label: "지급 사유", kind: "select", required: true, options: ["신규 입사", "업무상 추가 장비", "노후 정기교체", "신규 프로젝트", OTHER_OPTION], otherPlaceholder: "목록에 없는 지급 사유를 적어주세요" },
          { key: "asset_type", label: "기기 종류", kind: "select", required: true, options: deviceOptions },
          { key: "operating_system", label: "사용 환경", kind: "select", required: true, options: operatingSystemOptions, help: "실제 업무에 사용할 운영체제를 선택해 주세요." },
          { key: "quantity", label: "수량", kind: "number", required: true, min: 1, max: 20 },
          { key: "model_policy", label: "모델 구분", kind: "select", required: true, options: ["회사 표준모델", "비표준모델 요청"] },
          { key: "desired_spec", label: "희망 모델·사양", kind: "text", required: true, placeholder: "모델명, CPU, RAM 등", showWhen: { key: "model_policy", value: "비표준모델 요청" } },
          { key: "exception_reason", label: "비표준 필요 사유", kind: "textarea", required: true, placeholder: "표준모델로 수행하기 어려운 업무를 구체적으로 적어주세요", showWhen: { key: "model_policy", value: "비표준모델 요청" } },
          { key: "required_date", label: "필요일", kind: "date", required: true },
          { key: "business_use", label: "주요 사용 업무", kind: "textarea", required: true, placeholder: "사용 프로그램·프로젝트·업무 목적" },
        ],
        workflow: { route: "OA 자산관리팀", approval: "팀장 승인", sla: "재고 보유 시 3영업일", notice: "비표준모델은 팀장 승인 후 OA 운영 검토가 추가됩니다." },
      },
      {
        id: "oa-redeploy",
        label: "유휴자산 재배치",
        description: "보유 중인 유휴 장비 우선 지급",
        primaryField: "asset_type",
        fields: [
          { key: "asset_type", label: "기기 종류", kind: "select", required: true, options: deviceOptions },
          { key: "operating_system", label: "사용 환경", kind: "select", required: true, options: operatingSystemOptions },
          { key: "quantity", label: "수량", kind: "number", required: true, min: 1, max: 20 },
          { key: "required_date", label: "필요일", kind: "date", required: true },
          { key: "use_period", label: "예상 사용기간", kind: "select", required: true, options: ["1개월 미만", "1~3개월", "3~6개월", "6개월 이상", "상시 사용"] },
          { key: "business_use", label: "사용 목적", kind: "textarea", required: true, placeholder: "프로젝트명과 수행 업무를 적어주세요" },
        ],
        workflow: { route: "OA 자산관리팀 · 유휴재고", approval: "팀장 확인", sla: "재고 확인 후 2영업일", notice: "구매 전에 사용 가능한 유휴자산과 사양 적합성을 먼저 확인합니다." },
      },
      {
        id: "oa-loan",
        label: "대여·연장",
        description: "단기 또는 프로젝트 장비 대여",
        primaryField: "asset_type",
        fields: [
          { key: "loan_action", label: "신청 구분", kind: "select", required: true, options: ["일반 대여", "프로젝트 대여", "기존 대여 연장"] },
          { key: "asset_type", label: "기기 종류", kind: "select", required: true, options: deviceOptions },
          { key: "operating_system", label: "사용 환경", kind: "select", required: true, options: operatingSystemOptions },
          { key: "asset_tag", label: "현재 자산번호", kind: "text", required: true, validation: "asset", placeholder: "예: OA-123456", showWhen: { key: "loan_action", value: "기존 대여 연장" } },
          { key: "start_date", label: "대여 시작일", kind: "date", required: true },
          { key: "end_date", label: "반납 예정일", kind: "date", required: true },
          { key: "project_name", label: "프로젝트명", kind: "text", required: true, showWhen: { key: "loan_action", value: "프로젝트 대여" } },
          { key: "business_use", label: "사용 목적", kind: "textarea", required: true },
        ],
        workflow: { route: "OA 대여 운영", approval: "팀장 승인", sla: "재고 확인 후 2영업일", notice: "일반 대여는 최대 2개월, 프로젝트 대여는 최대 6개월 기준으로 확인합니다." },
      },
      {
        id: "oa-return",
        label: "반납",
        description: "지급·대여 장비 회수 및 반납",
        primaryField: "asset_tag",
        fields: [
          { key: "asset_type", label: "기기 종류", kind: "select", required: true, options: deviceOptions },
          { key: "asset_tag", label: "자산번호", kind: "text", required: true, validation: "asset", placeholder: "자산 스티커 번호" },
          { key: "return_reason", label: "반납 사유", kind: "select", required: true, options: ["퇴사", "교체 후 기존 장비 반납", "대여 종료", "프로젝트 종료", "미사용·유휴", "기타"] },
          { key: "return_date", label: "희망 반납일", kind: "date", required: true },
          { key: "condition", label: "현재 상태", kind: "select", required: true, options: ["정상", "경미한 사용 흔적", "파손·고장 있음", "부속품 분실"] },
          { key: "backup_complete", label: "필요한 자료의 백업을 완료했어요", kind: "checkbox", required: true, help: "반납 후 장비 데이터가 초기화될 수 있습니다." },
        ],
        workflow: { route: "OA 회수·검수", approval: "승인 없음", sla: "접수 후 1영업일 내 안내", notice: "회수 시 자산번호·부속품·외관 상태를 확인하고 지급 이력을 종료합니다." },
      },
      {
        id: "oa-repair",
        label: "고장·교체",
        description: "장비 장애, 파손, 성능 문제",
        primaryField: "asset_type",
        fields: [
          { key: "asset_type", label: "기기 종류", kind: "select", required: true, options: deviceOptions },
          { key: "asset_tag", label: "자산번호", kind: "text", required: true, validation: "asset", placeholder: "예: OA-123456" },
          { key: "operating_system", label: "현재 사용 환경", kind: "select", required: true, options: operatingSystemOptions },
          { key: "symptom", label: "장애 증상", kind: "textarea", required: true, placeholder: "언제부터 어떤 상황에서 문제가 발생하는지 적어주세요" },
          { key: "work_impact", label: "업무 영향", kind: "select", required: true, options: ["업무 가능·불편 있음", "일부 업무 불가", "업무 전면 불가"] },
          { key: "backup_complete", label: "데이터 백업을 완료했어요", kind: "checkbox", help: "수리 과정에서 초기화가 필요할 수 있습니다." },
        ],
        workflow: { route: "OA HelpDesk", approval: "수리비 발생 시 별도 확인", sla: "4시간 이내 진단", notice: "수리비와 잔존가 중 낮은 금액 기준을 검토해 수리·교체 방식을 안내합니다." },
      },
    ],
  },
  {
    id: "ACCESS_SECURITY",
    label: "출입·보안",
    description: "출입증, 방문객",
    icon: "badge",
    tone: "mint",
    otherRoute: "출입보안 운영",
    detailLocationRequired: false,
    detailLocationPlaceholder: "출입 대상 층·구역",
    requestTypes: [
      {
        id: "access-card",
        label: "사원증·출입증",
        description: "신규, 재발급, 훼손, 반납",
        primaryField: "card_action",
        fields: [
          { key: "card_action", label: "신청 구분", kind: "select", required: true, options: ["신규 발급", "분실 재발급", "훼손 교체", "퇴사·휴직 반납"] },
          { key: "target_name", label: "대상자", kind: "text", required: true, placeholder: "이름 또는 사번" },
          { key: "access_zone", label: "필요 출입구역", kind: "multi", required: true, options: ["기본 사무공간", "IDC·서버실", "문서고", "임원구역", "야간·휴일"], allowOther: true },
          { key: "loss_reported", label: "분실 사실을 보안센터에 신고했어요", kind: "checkbox", required: true, showWhen: { key: "card_action", value: "분실 재발급" } },
        ],
        workflow: { route: "출입보안 운영", approval: "특수구역은 구역 책임자 승인", sla: "1영업일", notice: "분실 재발급은 기존 카드 권한을 즉시 중지합니다." },
      },
      {
        id: "access-change",
        label: "출입권한 변경",
        description: "층·구역·야간 권한 추가 또는 회수",
        primaryField: "access_zone",
        fields: [
          { key: "target_name", label: "대상자", kind: "text", required: true, placeholder: "이름 또는 사번" },
          { key: "change_action", label: "변경 구분", kind: "select", required: true, options: ["권한 추가", "권한 회수", "기간 연장"] },
          { key: "access_zone", label: "대상 구역", kind: "multi", required: true, options: ["기본 사무공간", "IDC·서버실", "문서고", "임원구역", "야간·휴일"], allowOther: true },
          { key: "start_date", label: "적용 시작일", kind: "date", required: true },
          { key: "end_date", label: "종료일", kind: "date", help: "상시 권한이면 비워두세요." },
          { key: "business_reason", label: "업무 사유", kind: "textarea", required: true },
        ],
        workflow: { route: "출입보안 운영", approval: "소속 팀장 → 구역 책임자", sla: "승인 후 1영업일", notice: "기간형 권한은 종료일 다음 날 자동 회수 대상으로 분류합니다." },
      },
      {
        id: "access-visitor",
        label: "방문객 출입",
        description: "외부 방문자 사전 등록",
        primaryField: "visitor_company",
        fields: [
          { key: "visitor_company", label: "방문 회사", kind: "text", required: true },
          { key: "visitor_name", label: "방문자명", kind: "text", required: true, placeholder: "여러 명이면 대표자 외 인원수 기재" },
          { key: "visit_date", label: "방문일", kind: "date", required: true },
          { key: "start_time", label: "입실 예정시간", kind: "time", required: true },
          { key: "end_time", label: "퇴실 예정시간", kind: "time", required: true },
          { key: "visit_purpose", label: "방문 목적", kind: "textarea", required: true },
        ],
        workflow: { route: "1층 안내데스크 · 보안센터", approval: "방문 주관자 확인", sla: "방문 전일까지 등록", notice: "방문 당일 신분 확인 후 임시 출입증을 발급합니다." },
      },
      {
        id: "access-vendor",
        label: "협력사 상주·작업",
        description: "장기 출입 또는 시설 작업자 등록",
        primaryField: "vendor_company",
        fields: [
          { key: "vendor_company", label: "협력사명", kind: "text", required: true },
          { key: "worker_count", label: "작업 인원", kind: "number", required: true, min: 1, max: 100 },
          { key: "start_date", label: "출입 시작일", kind: "date", required: true },
          { key: "end_date", label: "출입 종료일", kind: "date", required: true },
          { key: "access_zone", label: "작업 구역", kind: "multi", required: true, options: ["사무공간", "기계·전기실", "IDC·서버실", "주차장", "옥상·외부"], allowOther: true },
          { key: "security_agreed", label: "보안·안전 수칙 안내를 완료했어요", kind: "checkbox", required: true },
        ],
        workflow: { route: "보안센터 · 시설 담당", approval: "작업 주관부서 → 보안 책임자", sla: "2영업일", notice: "출입 종료일 기준으로 권한 회수 작업을 자동 생성합니다." },
      },
    ],
  },
  {
    id: "SUPPLIES",
    label: "비품·소모품",
    description: "사무용품, 비품",
    icon: "package",
    tone: "orange",
    otherRoute: "총무 비품 운영",
    detailLocationRequired: true,
    detailLocationPlaceholder: "층·팀 좌석 또는 배송 위치",
    requestTypes: [
      {
        id: "supply-standard",
        label: "사무용품 신청",
        description: "상시 재고 소모품 지급",
        primaryField: "item_name",
        fields: [
          { key: "item_category", label: "품목 분류", kind: "select", required: true, options: ["필기·노트", "파일·정리", "포장·배송", "탕비·위생", "전산 소모품", "기타"] },
          { key: "item_name", label: "품목명", kind: "text", required: true, placeholder: "규격·색상 포함" },
          { key: "quantity", label: "수량", kind: "number", required: true, min: 1, max: 100 },
          { key: "required_date", label: "필요일", kind: "date", required: true },
        ],
        workflow: { route: "비품 창고", approval: "재고 기준 초과 시 팀장 확인", sla: "재고 보유 시 1영업일", notice: "보유 재고를 우선 배정하고 품절 시 구매 일정으로 전환합니다." },
      },
      {
        id: "supply-purchase",
        label: "비표준 비품 구매",
        description: "카탈로그에 없는 품목 구매",
        primaryField: "item_name",
        fields: [
          { key: "item_name", label: "품목명", kind: "text", required: true },
          { key: "specification", label: "규격·모델", kind: "text", required: true },
          { key: "quantity", label: "수량", kind: "number", required: true, min: 1, max: 100 },
          { key: "expected_price", label: "예상 단가(원)", kind: "number", required: true, min: 0 },
          { key: "required_date", label: "필요일", kind: "date", required: true },
          { key: "business_reason", label: "구매 필요 사유", kind: "textarea", required: true },
        ],
        workflow: { route: "총무 구매 담당", approval: "팀장 승인 → 예산 확인", sla: "승인 후 5영업일", notice: "표준품 대체 가능 여부와 예산을 먼저 확인합니다." },
      },
      {
        id: "supply-rental",
        label: "렌탈 장비",
        description: "행사·회의용 단기 장비",
        primaryField: "equipment",
        fields: [
          { key: "equipment", label: "장비 종류", kind: "multi", required: true, options: ["프로젝터", "스크린", "무선마이크", "스피커", "이동형 모니터", "테이블·의자"], allowOther: true },
          { key: "quantity", label: "수량", kind: "number", required: true, min: 1, max: 50 },
          { key: "start_date", label: "대여 시작일", kind: "date", required: true },
          { key: "end_date", label: "반납일", kind: "date", required: true },
          { key: "event_name", label: "행사·회의명", kind: "text", required: true },
        ],
        workflow: { route: "비품 렌탈 운영", approval: "부족 재고·외부 임차 시 팀장 승인", sla: "재고 확인 후 1영업일", notice: "동일 일정의 예약과 재고를 확인한 후 확정합니다." },
      },
      {
        id: "supply-event",
        label: "대량·행사 물품",
        description: "행사 키트, 대량 포장·배송",
        primaryField: "event_name",
        fields: [
          { key: "event_name", label: "행사명", kind: "text", required: true },
          { key: "item_list", label: "필요 품목", kind: "textarea", required: true, placeholder: "품목별 규격과 수량을 적어주세요" },
          { key: "attendees", label: "예상 인원", kind: "number", required: true, min: 1, max: 5000 },
          { key: "delivery_date", label: "납품 희망일", kind: "date", required: true },
          { key: "delivery_method", label: "수령 방식", kind: "select", required: true, options: ["사내 지정장소", "외부 행사장 배송", "개별 발송"] },
        ],
        workflow: { route: "총무 구매 · 물류", approval: "예산 담당 승인", sla: "견적 확인 후 일정 안내", notice: "수량과 배송 방식에 따라 견적·납기 확인 단계가 추가됩니다." },
      },
    ],
  },
  {
    id: "PARKING_VEHICLE",
    label: "주차·차량",
    description: "주차권, 업무차량",
    icon: "car",
    tone: "sky",
    otherRoute: "주차·차량 운영",
    detailLocationRequired: false,
    detailLocationPlaceholder: "주차 위치",
    requestTypes: [
      {
        id: "parking-visitor",
        label: "방문 주차 등록",
        description: "외부 방문 차량 사전 등록",
        primaryField: "vehicle_number",
        fields: [
          { key: "vehicle_number", label: "차량번호", kind: "text", required: true, validation: "vehicle", placeholder: "예: 123가4567", help: "띄어쓰기 없이 입력해 주세요." },
          { key: "visitor_company", label: "방문 회사", kind: "text", required: true },
          { key: "visitor_name", label: "방문자명", kind: "text", required: true },
          { key: "visit_date", label: "방문일", kind: "date", required: true },
          { key: "entry_time", label: "입차 예정시간", kind: "time", required: true },
          { key: "exit_time", label: "출차 예정시간", kind: "time", required: true },
          { key: "visit_purpose", label: "방문 목적", kind: "text", required: true },
        ],
        workflow: { route: "주차 운영 · 안내데스크", approval: "방문 주관자 확인", sla: "방문 전일까지 등록", notice: "차량번호를 주차 시스템 형식에 맞춰 자동 검증합니다." },
      },
      {
        id: "parking-regular",
        label: "정기주차 신규·변경",
        description: "월 정기권 발급 또는 차량 변경",
        primaryField: "vehicle_number",
        fields: [
          { key: "parking_action", label: "신청 구분", kind: "select", required: true, options: ["정기주차 신규", "등록 차량 변경", "정기주차 해지"] },
          { key: "vehicle_number", label: "차량번호", kind: "text", required: true, validation: "vehicle", placeholder: "예: 123가4567" },
          { key: "vehicle_type", label: "차량 종류", kind: "select", required: true, options: ["승용", "SUV", "승합", "전기차", "경차"], allowOther: true },
          { key: "effective_date", label: "적용 희망일", kind: "date", required: true },
          { key: "parking_reason", label: "신청 사유", kind: "textarea", required: true },
          { key: "ownership_confirm", label: "본인·가족 명의 차량임을 확인했어요", kind: "checkbox", required: true, showWhen: { key: "parking_action", value: "정기주차 신규" } },
        ],
        workflow: { route: "주차 정기권 운영", approval: "지원 대상·잔여면 확인", sla: "3영업일", notice: "지원 기준과 주차면 잔여 수량을 확인한 뒤 승인합니다." },
      },
      {
        id: "parking-business",
        label: "업무 차량·일일주차",
        description: "출장·외근용 차량 또는 일일 지원",
        primaryField: "vehicle_number",
        fields: [
          { key: "support_type", label: "지원 구분", kind: "select", required: true, options: ["개인차량 업무주차", "업무용 차량 예약", "타 사옥 일일주차"] },
          { key: "vehicle_number", label: "차량번호", kind: "text", required: true, validation: "vehicle", placeholder: "예: 123가4567", showWhen: { key: "support_type", value: "개인차량 업무주차" } },
          { key: "use_date", label: "사용일", kind: "date", required: true },
          { key: "start_time", label: "사용 시작시간", kind: "time", required: true },
          { key: "end_time", label: "사용 종료시간", kind: "time", required: true },
          { key: "destination", label: "목적지", kind: "text", required: true },
          { key: "business_reason", label: "업무 목적", kind: "textarea", required: true },
        ],
        workflow: { route: "차량 운영 담당", approval: "팀장 확인", sla: "1영업일", notice: "동일 시간 예약과 지원 기준을 확인해 차량 또는 주차권을 배정합니다." },
      },
      {
        id: "parking-issue",
        label: "주차 오류·정산",
        description: "미등록, 출차 오류, 요금 정산",
        primaryField: "vehicle_number",
        fields: [
          { key: "vehicle_number", label: "차량번호", kind: "text", required: true, validation: "vehicle", placeholder: "예: 123가4567" },
          { key: "issue_type", label: "문제 유형", kind: "select", required: true, options: ["등록 누락", "출차 차단", "요금 과다 부과", "정기권 미인식", "기타"] },
          { key: "occurred_at", label: "발생 일시", kind: "text", required: true, placeholder: "예: 8월 17일 18:20" },
          { key: "amount", label: "결제 금액(원)", kind: "number", min: 0, showWhen: { key: "issue_type", value: "요금 과다 부과" } },
          { key: "issue_detail", label: "상세 내용", kind: "textarea", required: true },
        ],
        workflow: { route: "주차 운영 · 정산 담당", approval: "환불 발생 시 정산 확인", sla: "4시간 이내 확인", notice: "차량번호와 발생시각으로 주차 시스템 기록을 조회합니다." },
      },
    ],
  },
  {
    id: "SPACE_WORKPLACE",
    label: "좌석·공간",
    description: "좌석, 회의실, 행사",
    icon: "chair",
    tone: "pink",
    otherRoute: "Workplace 운영",
    detailLocationRequired: true,
    detailLocationPlaceholder: "현재 좌석 또는 사용 희망 공간",
    requestTypes: [
      {
        id: "space-seat",
        label: "좌석 이동·배치",
        description: "개인·팀 좌석 이동과 신규 배치",
        primaryField: "move_scope",
        fields: [
          { key: "move_scope", label: "이동 범위", kind: "select", required: true, options: ["개인 1명", "팀 일부", "팀 전체", "신규 조직 배치"], allowOther: true },
          { key: "people_count", label: "대상 인원", kind: "number", required: true, min: 1, max: 500 },
          { key: "desired_zone", label: "희망 층·구역", kind: "text", required: true },
          { key: "move_date", label: "희망 이동일", kind: "date", required: true },
          { key: "move_reason", label: "이동 사유", kind: "textarea", required: true },
        ],
        workflow: { route: "공간 운영 · IT 지원", approval: "조직장 승인", sla: "5영업일", notice: "좌석·네트워크·짐 이동 작업을 하나의 일정으로 묶어 배정합니다." },
      },
      {
        id: "space-event",
        label: "회의·행사 공간",
        description: "대형회의, 타운홀, 외부행사",
        primaryField: "event_name",
        fields: [
          { key: "event_name", label: "행사·회의명", kind: "text", required: true },
          { key: "space_type", label: "공간 유형", kind: "select", required: true, options: ["대회의실", "라운지·공용공간", "교육장", "외부 행사장"], allowOther: true },
          { key: "use_date", label: "사용일", kind: "date", required: true },
          { key: "start_time", label: "시작시간", kind: "time", required: true },
          { key: "end_time", label: "종료시간", kind: "time", required: true },
          { key: "attendees", label: "예상 인원", kind: "number", required: true, min: 1, max: 2000 },
          { key: "layout", label: "좌석 배치", kind: "select", required: true, options: ["기본 배치", "스쿨식", "극장식", "원형·그룹형", "스탠딩"], allowOther: true },
          { key: "equipment", label: "필요 장비", kind: "multi", options: ["프로젝터", "무선마이크", "스피커", "화상회의", "녹화", "무대"], allowOther: true },
        ],
        workflow: { route: "공간 운영 · 방송장비", approval: "공용공간·외부행사는 총무 승인", sla: "2영업일 내 가능 여부", notice: "공간 예약과 장비·좌석 세팅 작업을 함께 생성합니다." },
      },
      {
        id: "space-furniture",
        label: "가구·집기 배치",
        description: "책상, 의자, 수납, 파티션",
        primaryField: "furniture_type",
        fields: [
          { key: "furniture_type", label: "집기 종류", kind: "multi", required: true, options: ["책상", "의자", "서랍", "수납장", "파티션", "화이트보드"], allowOther: true },
          { key: "quantity", label: "수량", kind: "number", required: true, min: 1, max: 200 },
          { key: "request_action", label: "요청 구분", kind: "select", required: true, options: ["신규 배치", "이동", "회수", "교체"] },
          { key: "required_date", label: "희망 작업일", kind: "date", required: true },
          { key: "layout_detail", label: "배치·작업 설명", kind: "textarea", required: true },
        ],
        workflow: { route: "공간 운영 · 가구 협력사", approval: "신규 구매 시 예산 승인", sla: "3영업일 내 일정 안내", notice: "보유 유휴 가구를 우선 확인한 뒤 구매 또는 작업 일정을 결정합니다." },
      },
      {
        id: "space-improvement",
        label: "공간 개선 제안",
        description: "동선, 소음, 집중·협업환경 개선",
        primaryField: "improvement_type",
        fields: [
          { key: "improvement_type", label: "개선 분야", kind: "select", required: true, options: ["소음·집중환경", "동선·혼잡", "조명·분위기", "협업공간", "휴게·편의", "안전·접근성"], allowOther: true },
          { key: "current_problem", label: "현재 불편", kind: "textarea", required: true },
          { key: "suggestion", label: "제안 내용", kind: "textarea", required: true },
          { key: "affected_people", label: "영향 범위", kind: "select", required: true, options: ["개인", "팀", "층 전체", "전사"] },
        ],
        workflow: { route: "Workplace 기획", approval: "검토 후 개선과제 전환", sla: "5영업일 내 검토 회신", notice: "유사 제안과 이용 데이터를 함께 검토해 개선과제로 관리합니다." },
      },
    ],
  },
];

function requestTypesForService(service: ServiceDefinition): RequestTypeDefinition[] {
  return [
    ...service.requestTypes,
    {
      id: `other-${service.tone}`,
      label: "기타 요청",
      description: "목록에 없는 업무를 직접 설명",
      primaryField: "other_title",
      fields: [
        { key: "other_title", label: "요청 제목", kind: "text", required: true, placeholder: "필요한 업무를 한 줄로 적어주세요" },
        { key: "other_detail", label: "요청 내용", kind: "textarea", required: true, placeholder: "현재 상황, 필요한 조치, 희망 결과를 구체적으로 적어주세요" },
        { key: "desired_date", label: "희망 완료일", kind: "date", help: "정해진 일정이 있는 경우에만 선택해 주세요." },
      ],
      workflow: {
        route: service.otherRoute,
        approval: "내용 확인 후 결정",
        sla: "1영업일 내 담당 배정",
        notice: "접수 내용을 확인한 뒤 가장 알맞은 서비스 항목과 처리 절차로 재분류합니다.",
      },
    },
  ];
}

type CatalogMatch = {
  service: ServiceDefinition;
  requestType: RequestTypeDefinition;
  score: number;
};

const catalogAliases: Record<string, string[]> = {
  "facility-repair": ["전등", "조명", "문고장", "문 고장", "누수", "책상 고장", "의자 고장"],
  "facility-hvac": ["에어컨", "난방", "냉방", "공조", "환기", "더워", "더워요", "추워", "추워요"],
  "facility-cleaning": ["청소", "쓰레기", "악취", "해충", "벌레", "방역"],
  "facility-safety": ["위험", "안전", "넘어짐", "미끄러움", "파손", "비상"],
  "oa-purchase": ["컴퓨터 지급", "pc 지급", "노트북 지급", "맥북 지급", "모니터 지급", "신규 구매", "새 장비"],
  "oa-redeploy": ["유휴 장비", "유휴 재배치", "재사용", "중고 장비", "장비 이동"],
  "oa-loan": ["노트북 대여", "장비 대여", "빌려", "대여 연장", "임시 장비"],
  "oa-return": ["노트북 반납", "모니터 반납", "장비 반납", "회수", "퇴사 장비"],
  "oa-repair": ["노트북 고장", "모니터 고장", "부팅", "화면 깜빡임", "수리", "장비 장애"],
  "access-card": ["사원증", "출입카드", "카드 분실", "카드 재발급"],
  "access-change": ["출입 권한", "권한 변경", "층 출입", "보안 권한"],
  "access-visitor": ["방문자", "손님 출입", "외부인", "방문 등록"],
  "access-vendor": ["협력사 출입", "작업자 출입", "야간 출입", "주말 출입"],
  "supply-standard": ["볼펜", "복사용지", "노트", "사무용품", "소모품"],
  "supply-purchase": ["비표준 소모품", "특수 물품", "물품 구매"],
  "supply-rental": ["물품 대여", "장비 대여", "행사용 대여"],
  "supply-event": ["행사 물품", "현수막", "명찰", "기념품"],
  "parking-visitor": ["방문 차량", "방문차량", "차량번호", "주차 등록", "손님 주차"],
  "parking-regular": ["정기 주차", "정기주차", "월 주차", "주차권"],
  "parking-business": ["업무 차량", "업무차량", "일일 주차", "출장 차량"],
  "parking-issue": ["차단기", "출차 오류", "주차 정산", "주차 문제"],
  "space-seat": ["자리 이동", "좌석 이동", "자리 변경", "팀 이동"],
  "space-event": ["회의실", "타운홀", "대회의", "행사 공간", "교육장"],
  "space-furniture": ["책상 배치", "의자 배치", "가구 이동", "파티션", "수납장"],
  "space-improvement": ["소음", "동선", "집중 환경", "공간 개선", "협업 공간"],
};

const smartIntakeExamples = ["노트북 반납", "방문 차량 등록", "회의실이 너무 더워요"];
const searchStopWords = new Set(["요청", "신청", "해주세요", "해줘", "필요", "관련", "업무", "싶어요", "하려고", "합니다"]);

function normalizeSearchText(value: string) {
  return value
    .toLocaleLowerCase("ko-KR")
    .replace(/[^0-9a-z가-힣\s·]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findCatalogMatches(query: string): CatalogMatch[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];

  const compactQuery = normalizedQuery.replace(/\s/g, "");
  const queryTokens = normalizedQuery
    .split(" ")
    .filter((token) => token.length > 1 && !searchStopWords.has(token));

  return services
    .flatMap((service) => service.requestTypes.map((requestType) => {
      const aliases = catalogAliases[requestType.id] ?? [];
      const searchableParts = [
        service.label,
        service.description,
        requestType.label,
        requestType.description,
        ...requestType.fields.flatMap((field) => [field.label, ...(field.options ?? [])]),
      ];
      const searchableText = normalizeSearchText(searchableParts.join(" "));
      const compactSearchableText = searchableText.replace(/\s/g, "");
      let score = 0;

      aliases.forEach((alias) => {
        const normalizedAlias = normalizeSearchText(alias);
        const compactAlias = normalizedAlias.replace(/\s/g, "");
        if (compactQuery.includes(compactAlias) || compactAlias.includes(compactQuery)) score += 12;
        queryTokens.forEach((token) => {
          const compactToken = token.replace(/\s/g, "");
          if (compactToken.includes(compactAlias) || compactAlias.includes(compactToken)) score += 7;
        });
      });

      queryTokens.forEach((token) => {
        const compactToken = token.replace(/\s/g, "");
        if (compactSearchableText.includes(compactToken)) score += 4;
      });

      if (compactSearchableText.includes(compactQuery)) score += 8;
      if (compactQuery.includes(normalizeSearchText(requestType.label).replace(/\s/g, ""))) score += 10;
      if (compactQuery.includes(normalizeSearchText(service.label).replace(/\s/g, ""))) score += 3;

      return { service, requestType, score };
    }))
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score || a.requestType.label.localeCompare(b.requestType.label, "ko"))
    .slice(0, 4);
}

function fieldOptions(field: CatalogField) {
  const options = field.options ?? [];
  if (!field.allowOther || options.some((option) => option.startsWith("기타"))) return options;
  return [...options, OTHER_OPTION];
}

function hasOtherSelection(value: FieldValue | undefined) {
  if (Array.isArray(value)) return value.some((item) => item.startsWith("기타"));
  return typeof value === "string" && value.startsWith("기타");
}

function otherValueKey(fieldKey: string) {
  return `${fieldKey}__other`;
}

const initialRequests: RequestItem[] = [
  {
    id: "REQ-20260818-024",
    category: "시설·환경",
    title: "8층 회의실 냉방 온도 확인",
    status: "처리 중",
    location: "판교 오피스 8층 / A-08 회의실",
    assignee: "김민재 매니저",
    updated: "오늘 16:20",
    priority: "일반",
    created: "오늘 14:08",
    description: "회의실 온도가 계속 높게 유지됩니다. 냉방 상태를 확인해 주세요.",
    sla: "2시간 14분 남음",
  },
  {
    id: "REQ-20260818-019",
    category: "출입·보안",
    title: "출입카드 재발급 요청",
    status: "접수",
    location: "판교 오피스 1층 안내데스크",
    assignee: "배정 대기",
    updated: "오늘 11:42",
    priority: "긴급",
    created: "오늘 11:42",
    description: "출입카드를 분실해 임시 출입증을 사용 중입니다. 재발급을 요청합니다.",
    sla: "46분 남음",
  },
  {
    id: "REQ-20260817-083",
    category: "OA·IT",
    title: "27인치 모니터 화면 깜빡임",
    status: "완료",
    location: "판교 오피스 7층 / 7F-124",
    assignee: "박지훈 매니저",
    updated: "어제 17:35",
    priority: "일반",
    created: "어제 10:16",
    description: "업무 중 화면이 반복해서 꺼졌다 켜집니다. 케이블 교체 후에도 동일합니다.",
    sla: "기한 내 완료",
  },
  {
    id: "REQ-20260817-071",
    category: "주차·차량",
    title: "외부 협력사 방문 주차 등록",
    status: "처리 중",
    location: "판교 오피스 B2 주차장",
    assignee: "이지연 매니저",
    updated: "어제 15:10",
    priority: "일반",
    created: "어제 13:30",
    description: "8월 18일 오전 10시 방문 예정인 협력사 차량 1대 등록 요청입니다.",
    sla: "5시간 30분 남음",
  },
];

function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  let content: ReactNode;

  switch (name) {
    case "home":
      content = <><path d="M3 10.8 12 3l9 7.8"/><path d="M5.5 9.5V21h13V9.5"/><path d="M9 21v-7h6v7"/></>;
      break;
    case "plus":
      content = <><rect x="3" y="3" width="18" height="18" rx="5"/><path d="M12 8v8M8 12h8"/></>;
      break;
    case "list":
      content = <><rect x="5" y="3" width="14" height="18" rx="3"/><path d="M9 3.5V2h6v1.5M9 9h6M9 13h6M9 17h4"/></>;
      break;
    case "chart":
      content = <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>;
      break;
    case "bell":
      content = <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>;
      break;
    case "chevron":
      content = <path d="m9 5 7 7-7 7"/>;
      break;
    case "building":
      content = <><path d="M4 21V5l8-3v19M12 8h8v13M2 21h20"/><path d="M7.5 7h1M7.5 11h1M7.5 15h1M16 12h1M16 16h1"/></>;
      break;
    case "monitor":
      content = <><rect x="2.5" y="4" width="19" height="13" rx="2.5"/><path d="M8 21h8M12 17v4"/></>;
      break;
    case "badge":
      content = <><rect x="5" y="3" width="14" height="18" rx="3"/><path d="M9 3V1.5h6V3M8.5 9.5h7M8.5 14h4"/></>;
      break;
    case "package":
      content = <><path d="m3 7 9-4 9 4-9 4-9-4Z"/><path d="M3 7v10l9 4 9-4V7M12 11v10"/></>;
      break;
    case "car":
      content = <><path d="m4 14 2-6h12l2 6v5H4v-5Z"/><path d="M7 19v2M17 19v2M7.5 15h.01M16.5 15h.01"/></>;
      break;
    case "chair":
      content = <><path d="M7 12V5a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v7M5 12h14v5H5zM7 17v4M17 17v4"/></>;
      break;
    case "search":
      content = <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>;
      break;
    case "clock":
      content = <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>;
      break;
    case "check":
      content = <path d="m5 12 4 4L19 6"/>;
      break;
    case "camera":
      content = <><path d="M4 7h4l2-3h4l2 3h4v12H4z"/><circle cx="12" cy="13" r="4"/></>;
      break;
    case "arrow":
      content = <path d="m15 18-6-6 6-6"/>;
      break;
    case "user":
      content = <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>;
      break;
    case "pin":
      content = <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>;
      break;
    case "alert":
      content = <><path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 9v5M12 17h.01"/></>;
      break;
    default:
      content = <><path d="m12 2 1.6 5.4L19 9l-5.4 1.6L12 16l-1.6-5.4L5 9l5.4-1.6L12 2Z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z"/></>;
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {content}
    </svg>
  );
}

function StatusBadge({ status }: { status: Status }) {
  return <span className={`status-badge status-${status.replace(" ", "-")}`}>{status}</span>;
}

function AppHeader({ title, back, onBack }: { title?: string; back?: boolean; onBack?: () => void }) {
  return (
    <header className={`top-header ${title ? "top-header-title" : ""}`}>
      {back ? (
        <button className="icon-button" onClick={onBack} aria-label="뒤로 가기"><Icon name="arrow" /></button>
      ) : title ? (
        <span className="brand-mini" aria-hidden="true"><span className="brand-dot" /></span>
      ) : (
        <div className="brand-mark"><span className="brand-dot" />WORKPLACE</div>
      )}
      {title && <h1>{title}</h1>}
      <button className="icon-button notification-button" aria-label="알림"><Icon name="bell" /><span className="notification-dot" /></button>
    </header>
  );
}

function HomeScreen({ requests, seats, rooms, seatAvailability, roomAvailability, onOpenRequest, onOpenDetail, onGoMine, onOpenSeat }: {
  requests: RequestItem[];
  seats: SeatRecord[];
  rooms: RoomRecord[];
  seatAvailability: number;
  roomAvailability: number;
  onOpenRequest: (category?: string, requestTypeId?: string) => void;
  onOpenDetail: (request: RequestItem) => void;
  onGoMine: () => void;
  onOpenSeat: () => void;
}) {
  const activeCount = requests.filter((request) => request.status !== "완료").length;
  const [finderQuery, setFinderQuery] = useState("");
  const catalogMatches = useMemo(() => findCatalogMatches(finderQuery), [finderQuery]);

  const employeeName = "김도윤";
  const mySeat = seats.find((seat) => seat.assignedTo === "본인");
  const myBooking = rooms
    .map((room) => ({ room, booking: room.bookings.find((booking) => booking.date === "2026-08-18" && booking.organizer === employeeName) }))
    .find((entry) => entry.booking);

  return (
    <>
      <AppHeader />
      <main className="screen home-screen">
        <section className="profile-hero">
          <span className="profile-avatar" aria-hidden="true">{employeeName[0]}</span>
          <span className="profile-copy">
            <small>안녕하세요</small>
            <b>{employeeName}님</b>
            <em>Product · {getWorkplaceBuilding(mySeat?.buildingId ?? "pangyo").name}</em>
          </span>
          <span className="tag-positive">오피스 근무</span>
        </section>

        {(mySeat || myBooking) && (
          <section className="card today-reservation-card">
            <div className="section-heading">
              <div><small>8월 18일 화요일</small><h2>오늘의 예약</h2></div>
              <button type="button" className="link-accent" onClick={onOpenSeat}>공간 전체보기</button>
            </div>
            {mySeat && (
              <div className="today-reservation-row">
                <span className="today-reservation-icon tone-blue"><Icon name="chair" size={20} /></span>
                <span><small>내 좌석</small><b>{mySeat.id}</b><em>{getWorkplaceBuilding(mySeat.buildingId).shortName} · {mySeat.floorId}층 · {mySeat.zoneLabel}</em></span>
                <span className="tag-positive">배정 좌석</span>
              </div>
            )}
            {myBooking?.booking && (
              <div className="today-reservation-row">
                <span className="today-reservation-icon tone-mint"><Icon name="building" size={20} /></span>
                <span><small>내 회의실</small><b>{myBooking.room.name}</b><em>{myBooking.booking.start}–{myBooking.booking.end} · {myBooking.booking.title}</em></span>
                <span className="tag-positive">예약 완료</span>
              </div>
            )}
          </section>
        )}

        <section className="smart-intake" aria-labelledby="smart-intake-title">
          <div className="smart-intake-heading">
            <span className="smart-intake-icon"><Icon name="search" size={19} /></span>
            <span><b id="smart-intake-title">문장으로 업무 찾기</b><small>상황을 적으면 관련 신청 항목을 바로 찾아드려요</small></span>
          </div>
          <label className="visually-hidden" htmlFor="smart-intake-query">필요한 업무 또는 현재 상황</label>
          <div className="smart-search-field">
            <Icon name="search" size={19} />
            <input
              id="smart-intake-query"
              type="search"
              value={finderQuery}
              onChange={(event) => setFinderQuery(event.target.value)}
              placeholder="예: 노트북을 반납하고 싶어요"
              autoComplete="off"
              enterKeyHint="search"
            />
          </div>
          {!finderQuery.trim() && (
            <div className="smart-intake-examples" aria-label="검색 예시">
              {smartIntakeExamples.map((example) => (
                <button type="button" key={example} onClick={() => setFinderQuery(example)}>{example}</button>
              ))}
            </div>
          )}
          {finderQuery.trim() && (
            <div className="smart-intake-results" aria-live="polite">
              {catalogMatches.length > 0 ? catalogMatches.map(({ service, requestType }) => (
                <button
                  type="button"
                  className="smart-intake-result"
                  key={`${service.id}:${requestType.id}`}
                  onClick={() => onOpenRequest(service.label, requestType.id)}
                >
                  <span className={`smart-result-icon tone-${service.tone}`}><Icon name={service.icon} size={19} /></span>
                  <span><small>{service.label}</small><b>{requestType.label}</b><em>{requestType.description}</em></span>
                  <Icon name="chevron" size={17} />
                </button>
              )) : (
                <div className="smart-intake-empty">
                  <span>알맞은 항목을 찾지 못했어요.</span>
                  <button type="button" onClick={() => onOpenRequest("시설·환경", "other-blue")}>기타 요청으로 작성</button>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="section-block quick-action-section">
          <div className="section-heading"><div><span className="eyebrow">QUICK ACTIONS</span><h2>바로 실행</h2></div><small>자주 쓰는 업무</small></div>
          <div className="quick-action-grid">
            <button type="button" className="quick-action-tile" onClick={onOpenSeat}>
              <span className="quick-action-icon tone-blue"><Icon name="chair" size={20} /></span>
              <b>좌석·회의실</b><small>예약 가능 공간 찾기</small>
            </button>
            <button type="button" className="quick-action-tile" onClick={() => onOpenRequest("출입·보안", "access-visitor")}>
              <span className="quick-action-icon tone-blue"><Icon name="badge" size={20} /></span>
              <b>방문자 등록</b><small>외부 방문 사전 신청</small>
            </button>
            <button type="button" className="quick-action-tile" onClick={() => onOpenRequest("OA·IT", "oa-return")}>
              <span className="quick-action-icon tone-blue"><Icon name="package" size={20} /></span>
              <b>OA 반납</b><small>기기 반납 신청</small>
            </button>
            <button type="button" className="quick-action-tile" onClick={onGoMine}>
              <span className="quick-action-icon tone-blue"><Icon name="list" size={20} /></span>
              <b>내 요청</b><small>진행 상태 확인</small>
            </button>
          </div>
        </section>

        <button className="active-summary" onClick={onGoMine}>
          <span className="active-summary-icon"><Icon name="clock" size={20} /></span>
          <span><b>진행 중인 요청 {activeCount}건</b><small>처리 현황을 확인해 보세요</small></span>
          <Icon name="chevron" size={18} />
        </button>

        <section className="section-block">
          <div className="section-heading"><h2>어떤 도움이 필요하세요?</h2></div>
          <div className="service-grid">
            {services.map((service) => (
              <button
                className={`service-tile ${service.id === "SPACE_WORKPLACE" ? "service-tile-space" : ""}`}
                key={service.label}
                onClick={() => service.id === "SPACE_WORKPLACE" ? onOpenSeat() : onOpenRequest(service.label)}
              >
                <span className={`service-icon tone-${service.tone}`}><Icon name={service.icon} size={25} /></span>
                <b>{service.label}</b>
                <small>{service.id === "SPACE_WORKPLACE" ? `좌석 ${seatAvailability}석 · 회의실 ${roomAvailability}개` : service.description}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="section-block recent-section">
          <div className="section-heading">
            <h2>최근 요청</h2>
            <button onClick={onGoMine}>전체보기</button>
          </div>
          <div className="card request-list-card">
            {requests.slice(0, 2).map((request) => (
              <button className="compact-request" key={request.id} onClick={() => onOpenDetail(request)}>
                <span className="request-copy"><small>{request.category}</small><b>{request.title}</b><em>{request.updated}</em></span>
                <span className="request-state"><StatusBadge status={request.status} /><Icon name="chevron" size={16} /></span>
              </button>
            ))}
          </div>
        </section>

        <section className="notice-card">
          <span className="notice-icon"><Icon name="sparkle" size={21} /></span>
          <span><b>총무 서비스 이용 안내</b><small>긴급 요청은 긴급도를 선택해 주세요</small></span>
          <Icon name="chevron" size={17} />
        </section>
      </main>
    </>
  );
}

function hasValue(value: FieldValue | undefined) {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "boolean") return value;
  return Boolean(String(value ?? "").trim());
}

function displayValue(value: FieldValue | undefined) {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "확인 완료" : "해당 없음";
  return String(value ?? "");
}

function RequestScreen({ initialCategory, initialRequestTypeId, onSubmit, onBack }: {
  initialCategory: string;
  initialRequestTypeId?: string;
  onSubmit: (request: Omit<RequestItem, "id" | "created" | "updated" | "status" | "assignee">) => void;
  onBack: () => void;
}) {
  const initialService = services.find((item) => item.label === initialCategory) ?? services[0];
  const initialRequestType = requestTypesForService(initialService).find((item) => item.id === initialRequestTypeId) ?? initialService.requestTypes[0];
  const [step, setStep] = useState<1 | 2>(1);
  const [category, setCategory] = useState(initialService.label);
  const [requestTypeId, setRequestTypeId] = useState(initialRequestType.id);
  const [values, setValues] = useState<FormValues>({});
  const [location, setLocation] = useState("판교 오피스");
  const [detailLocation, setDetailLocation] = useState("");
  const [priority, setPriority] = useState<Priority>(initialRequestType.defaultPriority ?? "일반");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [fileName, setFileName] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const service = services.find((item) => item.label === category) ?? services[0];
  const requestTypeOptions = requestTypesForService(service);
  const requestType = requestTypeOptions.find((item) => item.id === requestTypeId) ?? requestTypeOptions[0];
  const visibleFields = requestType.fields.filter((field) => !field.showWhen || values[field.showWhen.key] === field.showWhen.value);
  const resolvedPriority: Priority = (requestType.defaultPriority || values.safety_risk === true || values.biohazard === true) ? "긴급" : priority;
  const resolvedApproval = requestType.id === "oa-purchase" && values.model_policy === "비표준모델 요청"
    ? "팀장 승인 → OA 운영 검토"
    : requestType.workflow.approval;

  const updateValue = (key: string, value: FieldValue) => {
    setValues((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const changeCategory = (nextCategory: string) => {
    const nextService = services.find((item) => item.label === nextCategory) ?? services[0];
    setCategory(nextService.label);
    setRequestTypeId(nextService.requestTypes[0].id);
    setValues({});
    setFieldErrors({});
    setError("");
    setPriority(nextService.requestTypes[0].defaultPriority ?? "일반");
    setDetailLocation("");
  };

  const changeRequestType = (nextType: RequestTypeDefinition) => {
    setRequestTypeId(nextType.id);
    setValues({});
    setFieldErrors({});
    setError("");
    setPriority(nextType.defaultPriority ?? "일반");
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    visibleFields.forEach((field) => {
      const value = values[field.key];
      if (field.required && !hasValue(value)) {
        nextErrors[field.key] = `${field.label}을(를) 입력해 주세요.`;
        return;
      }
      if (!hasValue(value)) return;
      const stringValue = String(value);
      if (field.validation === "vehicle" && !/^\d{2,3}[가-힣]\d{4}$/.test(stringValue.replace(/\s/g, ""))) {
        nextErrors[field.key] = "차량번호를 ‘123가4567’ 형식으로 입력해 주세요.";
      }
      if (field.validation === "asset" && stringValue.trim().length < 4) {
        nextErrors[field.key] = "자산 스티커 또는 장비의 전체 번호를 입력해 주세요.";
      }
      if (field.kind === "number") {
        const numericValue = Number(value);
        if (field.min !== undefined && numericValue < field.min) nextErrors[field.key] = `${field.min} 이상 입력해 주세요.`;
        if (field.max !== undefined && numericValue > field.max) nextErrors[field.key] = `${field.max} 이하로 입력해 주세요.`;
      }
      if (hasOtherSelection(value) && !hasValue(values[otherValueKey(field.key)])) {
        nextErrors[otherValueKey(field.key)] = `${field.label}의 기타 내용을 입력해 주세요.`;
      }
    });

    const startDate = String(values.start_date ?? "");
    const endDate = String(values.end_date ?? "");
    if (startDate && endDate && endDate < startDate) nextErrors.end_date = "종료일은 시작일보다 빠를 수 없어요.";

    const startTime = String(values.start_time ?? values.entry_time ?? "");
    const endTime = String(values.end_time ?? values.exit_time ?? "");
    if (startTime && endTime && endTime <= startTime) {
      const key = values.end_time ? "end_time" : "exit_time";
      nextErrors[key] = "종료시간은 시작시간보다 늦어야 해요.";
    }

    if (service.detailLocationRequired && !detailLocation.trim()) nextErrors.detail_location = service.detailLocationPlaceholder + "을(를) 입력해 주세요.";

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setError("필수 입력항목과 입력 형식을 다시 확인해 주세요.");
      return false;
    }
    setError("");
    return true;
  };

  const moveToReview = () => {
    if (!validate()) return;
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const detailRows = visibleFields.flatMap((field) => {
    if (!hasValue(values[field.key])) return [];
    const rows = [{ key: field.key, label: field.label, value: displayValue(values[field.key]) }];
    if (hasOtherSelection(values[field.key])) {
      rows.push({ key: otherValueKey(field.key), label: `${field.label} · 직접 입력`, value: displayValue(values[otherValueKey(field.key)]) });
    }
    return rows;
  });
  const primaryKey = requestType.primaryField ?? "";
  const primaryValue = hasOtherSelection(values[primaryKey])
    ? displayValue(values[otherValueKey(primaryKey)])
    : displayValue(values[primaryKey]);
  const generatedTitle = primaryValue ? `${requestType.label} · ${primaryValue}` : requestType.label;
  const longAnswer = visibleFields.find((field) => field.kind === "textarea" && hasValue(values[field.key]));
  const generatedDescription = additionalNotes.trim() || (longAnswer ? displayValue(values[longAnswer.key]) : `${requestType.label} 요청입니다.`);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit({
      category,
      categoryCode: service.id,
      serviceItem: requestType.label,
      serviceItemId: requestType.id,
      location: service.detailLocationRequired ? `${location} / ${detailLocation}` : location,
      priority: resolvedPriority,
      title: generatedTitle,
      description: generatedDescription,
      details: detailRows,
      route: requestType.workflow.route,
      approval: resolvedApproval,
      sla: requestType.workflow.sla,
    });
  };

  const renderField = (field: CatalogField) => {
    const value = values[field.key];
    const id = `catalog-${field.key}`;
    const otherKey = otherValueKey(field.key);
    const showOtherInput = hasOtherSelection(value);
    const options = fieldOptions(field);
    return (
      <section className={`form-section dynamic-field ${fieldErrors[field.key] || fieldErrors[otherKey] ? "has-error" : ""}`} key={field.key}>
        {field.kind !== "checkbox" && (
          <label htmlFor={field.kind === "multi" ? undefined : id}>
            {field.label}{field.required && <em className="required-mark">필수</em>}
          </label>
        )}

        {field.kind === "select" ? (
          <div className="select-wrap">
            <select id={id} value={String(value ?? "")} onChange={(event) => updateValue(field.key, event.target.value)}>
              <option value="">선택해 주세요</option>
              {options.map((option) => <option key={option}>{option}</option>)}
            </select>
            <Icon name="chevron" size={17} />
          </div>
        ) : field.kind === "textarea" ? (
          <textarea id={id} value={String(value ?? "")} onChange={(event) => updateValue(field.key, event.target.value)} placeholder={field.placeholder} maxLength={500} />
        ) : field.kind === "checkbox" ? (
          <label className={`check-field ${value === true ? "checked" : ""}`}>
            <input type="checkbox" checked={value === true} onChange={(event) => updateValue(field.key, event.target.checked)} />
            <span className="check-control">{value === true && <Icon name="check" size={14} />}</span>
            <span><b>{field.label}{field.required && <em className="required-mark">필수</em>}</b>{field.help && <small>{field.help}</small>}</span>
          </label>
        ) : field.kind === "multi" ? (
          <div className="multi-choice-grid" role="group" aria-label={field.label}>
            {options.map((option) => {
              const selected = Array.isArray(value) && value.includes(option);
              return (
                <button type="button" className={selected ? "selected" : ""} key={option} onClick={() => {
                  const current = Array.isArray(value) ? value : [];
                  updateValue(field.key, selected ? current.filter((item) => item !== option) : [...current, option]);
                }}>
                  <span>{selected && <Icon name="check" size={13} />}</span>{option}
                </button>
              );
            })}
          </div>
        ) : (
          <input
            id={id}
            type={field.kind}
            value={String(value ?? "")}
            min={field.min}
            max={field.max}
            inputMode={field.kind === "number" ? "numeric" : undefined}
            onChange={(event) => updateValue(field.key, event.target.value)}
            placeholder={field.placeholder}
          />
        )}

        {showOtherInput && (
          <div className={`other-input-block ${fieldErrors[otherKey] ? "has-error" : ""}`}>
            <label htmlFor={`catalog-${otherKey}`}>{field.label} 직접 입력<em className="required-mark">필수</em></label>
            <textarea
              id={`catalog-${otherKey}`}
              value={String(values[otherKey] ?? "")}
              onChange={(event) => updateValue(otherKey, event.target.value)}
              placeholder={field.otherPlaceholder ?? "목록에 없는 내용을 구체적으로 적어주세요"}
              maxLength={300}
            />
            {fieldErrors[otherKey] && <p className="field-inline-error" role="alert">{fieldErrors[otherKey]}</p>}
          </div>
        )}

        {field.help && field.kind !== "checkbox" && <p className="field-help">{field.help}</p>}
        {fieldErrors[field.key] && <p className="field-inline-error" role="alert">{fieldErrors[field.key]}</p>}
      </section>
    );
  };

  return (
    <>
      <AppHeader title="업무 요청" back onBack={step === 2 ? () => setStep(1) : onBack} />
      <main className="screen request-screen">
        <div className="stepper" aria-label={`2단계 중 ${step}단계`}>
          <span className={step >= 1 ? "active" : ""} /><span className={step >= 2 ? "active" : ""} />
          <small>{step === 1 ? "업무 특성에 맞는 정보를 입력해 주세요" : "등록 전 내용과 처리 흐름을 확인해 주세요"}</small>
        </div>

        {step === 1 ? (
          <form className="request-form catalog-form" onSubmit={(event) => { event.preventDefault(); moveToReview(); }}>
            <section className="catalog-service-card">
              <span className={`service-icon tone-${service.tone}`}><Icon name={service.icon} size={24} /></span>
              <span><small>서비스 카테고리</small><b>{service.label}</b><em>{service.description}</em></span>
              <div className="service-switch select-wrap">
                <select aria-label="서비스 카테고리 변경" value={category} onChange={(event) => changeCategory(event.target.value)}>
                  {services.map((item) => <option key={item.label}>{item.label}</option>)}
                </select>
                <Icon name="chevron" size={15} />
              </div>
            </section>

            <section className="catalog-section request-kind-section">
              <div className="catalog-section-title"><span>1</span><div><h2>신청할 업무를 선택하세요</h2><p>선택에 따라 필요한 항목과 처리 절차가 달라져요.</p></div></div>
              <div className="request-type-list">
                {requestTypeOptions.map((item) => (
                  <button type="button" className={requestType.id === item.id ? "selected" : ""} key={item.id} onClick={() => changeRequestType(item)}>
                    <span className="radio-dot"><i /></span>
                    <span><b>{item.label}</b><small>{item.description}</small></span>
                    <Icon name="chevron" size={16} />
                  </button>
                ))}
              </div>
            </section>

            <section className="workflow-preview">
              <div className="workflow-preview-head"><span><Icon name="sparkle" size={17} /></span><b>예상 처리 흐름</b></div>
              <div className="workflow-preview-grid">
                <span><small>담당</small><b>{requestType.workflow.route}</b></span>
                <span><small>승인</small><b>{resolvedApproval}</b></span>
                <span><small>처리 기준</small><b>{requestType.workflow.sla}</b></span>
              </div>
              <p>{requestType.workflow.notice}</p>
            </section>

            <section className="catalog-section">
              <div className="catalog-section-title"><span>2</span><div><h2>{requestType.label} 정보</h2><p>처리에 꼭 필요한 항목만 보여드려요.</p></div></div>
              <div className="dynamic-fields">{visibleFields.map(renderField)}</div>
            </section>

            <section className="catalog-section">
              <div className="catalog-section-title"><span>3</span><div><h2>공통 접수 정보</h2><p>처리 위치와 참고사항을 확인해 주세요.</p></div></div>
              <div className="dynamic-fields">
                <section className="form-section">
                  <label>오피스<em className="required-mark">필수</em></label>
                  <div className="select-wrap">
                    <select value={location} onChange={(event) => setLocation(event.target.value)}>
                      <option>판교 오피스</option><option>서울 오피스</option><option>광주 오피스</option>
                    </select>
                    <Icon name="chevron" size={17} />
                  </div>
                </section>

                {service.detailLocationRequired && (
                  <section className={`form-section ${fieldErrors.detail_location ? "has-error" : ""}`}>
                    <label htmlFor="detail-location">상세 위치<em className="required-mark">필수</em></label>
                    <input id="detail-location" value={detailLocation} onChange={(event) => { setDetailLocation(event.target.value); setFieldErrors((current) => ({ ...current, detail_location: "" })); }} placeholder={service.detailLocationPlaceholder} />
                    {fieldErrors.detail_location && <p className="field-inline-error" role="alert">{fieldErrors.detail_location}</p>}
                  </section>
                )}

                <section className="form-section">
                  <label>긴급도</label>
                  {requestType.defaultPriority ? (
                    <div className="auto-priority-card"><span><Icon name="alert" size={18} /></span><div><b>긴급 요청으로 자동 분류</b><small>안전 담당자와 보안센터에 즉시 알림을 보냅니다.</small></div></div>
                  ) : (
                    <>
                      <div className="segment-control">
                        <button type="button" className={resolvedPriority === "일반" ? "selected" : ""} onClick={() => setPriority("일반")}>일반</button>
                        <button type="button" className={resolvedPriority === "긴급" ? "selected urgent" : ""} onClick={() => setPriority("긴급")}>긴급</button>
                      </div>
                      <p className="field-help">안전·출입 장애처럼 즉시 조치가 필요한 경우에만 긴급을 선택해 주세요.</p>
                    </>
                  )}
                </section>

                <section className="form-section">
                  <label htmlFor="additional-notes">추가 참고사항 <small>(선택)</small></label>
                  <textarea id="additional-notes" value={additionalNotes} onChange={(event) => setAdditionalNotes(event.target.value)} maxLength={500} placeholder="담당자가 추가로 알아야 할 내용을 적어주세요" />
                  <span className="counter">{additionalNotes.length}/500</span>
                </section>

                <section className="form-section">
                  <label>증빙·사진 첨부 <small>(선택)</small></label>
                  <label className="upload-box">
                    <input type="file" accept="image/*,.pdf" onChange={(event) => setFileName(event.target.files?.[0]?.name || "")} />
                    <span className="upload-icon"><Icon name="camera" /></span>
                    <b>{fileName || "사진이나 증빙파일을 첨부해 주세요"}</b>
                    <small>{fileName ? "다른 파일을 선택하려면 눌러주세요" : "JPG, PNG, PDF · 최대 10MB"}</small>
                  </label>
                </section>
              </div>
            </section>

            {error && <p className="form-error" role="alert"><Icon name="alert" size={17} />{error}</p>}
            <button className="primary-button" type="submit">입력 내용 확인</button>
          </form>
        ) : (
          <form className="review-form" onSubmit={submit}>
            <section className="review-hero">
              <span className="review-icon"><Icon name="check" size={25} /></span>
              <h2>이대로 요청할까요?</h2>
              <p>등록하면 담당팀과 승인자에게 자동 전달돼요.</p>
            </section>

            <section className="review-summary-card">
              <span className={`service-icon tone-${service.tone}`}><Icon name={service.icon} size={23} /></span>
              <span><small>{category}</small><b>{requestType.label}</b><em>{generatedTitle}</em></span>
              <span className={`review-priority ${resolvedPriority === "긴급" ? "urgent" : ""}`}>{resolvedPriority}</span>
            </section>

            <section className="card review-card detail-review-card">
              <div><small>오피스·위치</small><b>{service.detailLocationRequired ? `${location} / ${detailLocation}` : location}</b></div>
              {detailRows.map((row) => <div key={row.label}><small>{row.label}</small><b>{row.value}</b></div>)}
              {additionalNotes && <div><small>추가 참고사항</small><p>{additionalNotes}</p></div>}
              {fileName && <div><small>첨부파일</small><b>{fileName}</b></div>}
            </section>

            <section className="workflow-review-card">
              <h3><Icon name="sparkle" size={18} />등록 후 처리</h3>
              <dl>
                <div><dt>담당팀</dt><dd>{requestType.workflow.route}</dd></div>
                <div><dt>승인 절차</dt><dd>{resolvedApproval}</dd></div>
                <div><dt>처리 기준</dt><dd>{requestType.workflow.sla}</dd></div>
              </dl>
            </section>

            <button className="primary-button" type="submit">요청 등록</button>
            <button className="text-button" type="button" onClick={() => setStep(1)}>내용 수정하기</button>
          </form>
        )}
      </main>
    </>
  );
}

function MyRequestsScreen({ requests, onOpenDetail }: { requests: RequestItem[]; onOpenDetail: (request: RequestItem) => void }) {
  const [filter, setFilter] = useState<"전체" | Status>("전체");
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => requests.filter((request) => {
    const statusMatch = filter === "전체" || request.status === filter;
    const searchable = `${request.title} ${request.category} ${request.serviceItem ?? ""} ${request.id} ${request.details?.map((detail) => detail.value).join(" ") ?? ""}`;
    const queryMatch = !query.trim() || searchable.toLowerCase().includes(query.toLowerCase());
    return statusMatch && queryMatch;
  }), [filter, query, requests]);

  return (
    <>
      <AppHeader title="내 요청" />
      <main className="screen mine-screen">
        <div className="search-field"><Icon name="search" size={20} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="요청명 또는 요청번호 검색" /></div>
        <div className="filter-tabs" role="tablist">
          {(["전체", "접수", "처리 중", "완료"] as const).map((item) => (
            <button role="tab" aria-selected={filter === item} className={filter === item ? "selected" : ""} key={item} onClick={() => setFilter(item)}>{item}</button>
          ))}
        </div>
        <p className="result-count">총 {filtered.length}건</p>
        <div className="request-card-list">
          {filtered.map((request) => (
            <button className="card request-card" key={request.id} onClick={() => onOpenDetail(request)}>
              <div className="request-card-top"><span>{request.category}{request.serviceItem ? ` · ${request.serviceItem}` : ""}</span><StatusBadge status={request.status} /></div>
              <h2>{request.title}</h2>
              <div className="request-meta"><span><Icon name="pin" size={15} />{request.location}</span><span><Icon name="user" size={15} />{request.assignee}</span></div>
              <div className="request-card-bottom"><small>{request.id}</small><em>{request.updated}</em><Icon name="chevron" size={16} /></div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="empty-state"><span><Icon name="search" /></span><h2>검색 결과가 없어요</h2><p>다른 검색어나 상태를 선택해 보세요.</p></div>
          )}
        </div>
      </main>
    </>
  );
}

function RequestDetailScreen({ request, onBack }: { request: RequestItem; onBack: () => void }) {
  const steps: Array<{ label: string; time: string; done: boolean }> = [
    { label: "요청이 접수됐어요", time: request.created, done: true },
    { label: request.status === "접수" ? "담당자를 배정하고 있어요" : "담당자가 처리를 시작했어요", time: request.status === "접수" ? "진행 예정" : request.updated, done: request.status !== "접수" },
    { label: "요청 처리가 완료됐어요", time: request.status === "완료" ? request.updated : "진행 예정", done: request.status === "완료" },
  ];

  return (
    <>
      <AppHeader title="요청 상세" back onBack={onBack} />
      <main className="screen detail-screen">
        <section className="detail-title">
          <div><span>{request.category}{request.serviceItem ? ` · ${request.serviceItem}` : ""}</span><StatusBadge status={request.status} /></div>
          <h1>{request.title}</h1>
          <p>{request.id}</p>
        </section>

        <section className="card progress-card">
          <div className="section-heading"><h2>처리 현황</h2><span className="sla-text"><Icon name="clock" size={15} />{request.sla}</span></div>
          <div className="timeline">
            {steps.map((step, index) => (
              <div className={`timeline-item ${step.done ? "done" : ""}`} key={step.label}>
                <span className="timeline-dot">{step.done && <Icon name="check" size={13} />}</span>
                {index < steps.length - 1 && <span className="timeline-line" />}
                <div><b>{step.label}</b><small>{step.time}</small></div>
              </div>
            ))}
          </div>
        </section>

        <section className="card detail-card">
          <h2>요청 정보</h2>
          <dl>
            <div><dt>위치</dt><dd>{request.location}</dd></div>
            <div><dt>긴급도</dt><dd className={request.priority === "긴급" ? "urgent-text" : ""}>{request.priority}</dd></div>
            <div><dt>담당자</dt><dd>{request.assignee}</dd></div>
            {request.route && <div><dt>담당팀</dt><dd>{request.route}</dd></div>}
            {request.approval && <div><dt>승인 절차</dt><dd>{request.approval}</dd></div>}
            {request.details?.map((detail) => <div key={detail.label}><dt>{detail.label}</dt><dd>{detail.value}</dd></div>)}
            <div className="detail-description"><dt>상세 내용</dt><dd>{request.description}</dd></div>
          </dl>
        </section>

        <button className="secondary-button">담당자에게 문의하기</button>
      </main>
    </>
  );
}

function OpsScreen({ requests, seatTotals, roomStats, onAdvance, onOpenSeatAdmin, onOpenBudgetAdmin }: {
  requests: RequestItem[];
  seatTotals: ReturnType<typeof getSeatTotals>;
  roomStats: ReturnType<typeof getRoomStats>;
  onAdvance: (request: RequestItem) => void;
  onOpenSeatAdmin: () => void;
  onOpenBudgetAdmin: () => void;
}) {
  const newCount = requests.filter((request) => request.status === "접수").length;
  const processingCount = requests.filter((request) => request.status === "처리 중").length;
  const completedCount = requests.filter((request) => request.status === "완료").length;
  const urgent = requests.filter((request) => request.priority === "긴급" && request.status !== "완료");

  return (
    <>
      <AppHeader title="운영현황" />
      <main className="screen ops-screen">
        <section className="ops-intro">
          <div><p className="eyebrow">2026년 8월 18일</p><h1>오늘의 업무 현황</h1></div>
          <button className="date-chip">오늘 <Icon name="chevron" size={15} /></button>
        </section>

        <section className="kpi-grid">
          <article className="kpi-card"><span>신규 접수</span><b>{newCount}<small>건</small></b><em className="kpi-blue">확인 필요</em></article>
          <article className="kpi-card"><span>처리 중</span><b>{processingCount}<small>건</small></b><em className="kpi-violet">정상 처리</em></article>
          <article className="kpi-card"><span>SLA 임박</span><b>{urgent.length}<small>건</small></b><em className="kpi-orange">우선 확인</em></article>
          <article className="kpi-card"><span>오늘 완료</span><b>{completedCount}<small>건</small></b><em className="kpi-green">완료</em></article>
        </section>

        <section className="ops-admin-tools" aria-label="관리자 도구">
          <button className="seat-admin-entry" onClick={onOpenSeatAdmin}>
            <span className="seat-admin-entry-icon"><Icon name="chair" size={24} /></span>
            <span><small>SPACE MANAGEMENT</small><b>공간 운영 관리</b><em>좌석 {seatTotals.total}석 · 회의실 {roomStats.total}개 · 오늘 예약 {roomStats.bookings}건</em></span>
            <strong>관리 열기 <Icon name="chevron" size={16} /></strong>
          </button>
          <button className="seat-admin-entry budget-admin-entry" onClick={onOpenBudgetAdmin}>
            <span className="seat-admin-entry-icon"><Icon name="chart" size={24} /></span>
            <span><small>BUDGET &amp; COST</small><b>예산·비용 관리</b><em>승인예산 12.0억원 · 가용잔액 3.1억원 · 검토 3건</em></span>
            <strong>현황 열기 <Icon name="chevron" size={16} /></strong>
          </button>
        </section>

        {urgent.length > 0 && (
          <section className="sla-alert"><span><Icon name="alert" size={21} /></span><div><b>SLA 임박 요청이 있어요</b><small>{urgent[0].title} · {urgent[0].sla}</small></div><Icon name="chevron" size={17} /></section>
        )}

        <section className="ops-list-section">
          <div className="section-heading"><div><p className="eyebrow">PRIORITY</p><h2>우선 확인 요청</h2></div><button>전체보기</button></div>
          <div className="ops-request-list">
            {requests.filter((request) => request.status !== "완료").map((request) => (
              <article className="card ops-request-card" key={request.id}>
                <div className="ops-card-top">
                  <span className={request.priority === "긴급" ? "priority urgent" : "priority"}>{request.priority === "긴급" ? "긴급" : request.category}</span>
                  <StatusBadge status={request.status} />
                </div>
                <h3>{request.title}</h3>
                {request.serviceItem && <span className="ops-service-item">{request.serviceItem}</span>}
                <p><Icon name="pin" size={15} />{request.location}</p>
                <div className="ops-owner"><span className="owner-avatar"><Icon name="user" size={16} /></span><span><small>담당자</small><b>{request.assignee}</b></span><em className={request.sla.includes("분") ? "sla-urgent" : ""}>{request.sla}</em></div>
                <button className="ops-action" onClick={() => onAdvance(request)}>{request.status === "접수" ? "담당자 배정·처리 시작" : "완료 처리"}</button>
              </article>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

function BottomNavigation({ active, onChange }: { active: NavigationTab; onChange: (tab: NavigationTab) => void }) {
  const tabs: Array<{ id: NavigationTab; label: string; icon: IconName }> = [
    { id: "home", label: "홈", icon: "home" },
    { id: "request", label: "신청", icon: "plus" },
    { id: "seat", label: "공간", icon: "chair" },
    { id: "mine", label: "내 요청", icon: "list" },
    { id: "ops", label: "운영", icon: "chart" },
  ];

  return (
    <nav className="bottom-nav" aria-label="주요 메뉴">
      {tabs.map((tab) => (
        <button className={active === tab.id ? "active" : ""} key={tab.id} onClick={() => onChange(tab.id)}>
          <Icon name={tab.icon} size={22} /><span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [requests, setRequests] = useState<RequestItem[]>(initialRequests);
  const [seats, setSeats] = useState<SeatRecord[]>(() => createInitialSeats());
  const [seatPolicies, setSeatPolicies] = useState<SeatPolicyRecord[]>(() => createInitialSeatPolicies());
  const [seatReservations, setSeatReservations] = useState<SeatReservation[]>(() => createInitialSeatReservations(seats, seatPolicies));
  const [rooms, setRooms] = useState<RoomRecord[]>(() => createInitialRooms());
  const [initialCategory, setInitialCategory] = useState("시설·환경");
  const [initialRequestTypeId, setInitialRequestTypeId] = useState<string | undefined>();
  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null);
  const [toast, setToast] = useState("");

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  };

  const changeTab = (tab: Tab) => {
    setSelectedRequest(null);
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openRequest = (category = "시설·환경", requestTypeId?: string) => {
    setInitialCategory(category);
    setInitialRequestTypeId(requestTypeId);
    changeTab("request");
  };

  const openDetail = (request: RequestItem) => {
    setSelectedRequest(request);
    setActiveTab("mine");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const addRequest = (request: Omit<RequestItem, "id" | "created" | "updated" | "status" | "assignee">) => {
    const nextNumber = String(requests.length + 25).padStart(3, "0");
    const requestId = `REQ-20260818-${nextNumber}`;
    const newRequest: RequestItem = {
      ...request,
      id: requestId,
      status: "접수",
      assignee: "배정 대기",
      created: "방금 전",
      updated: "방금 전",
      integration: createIntegrationEnvelope({
        requestId,
        categoryCode: request.categoryCode ?? "UNMAPPED",
        itemCode: request.serviceItemId ?? "other",
        title: request.title,
        priority: request.priority,
        location: request.location,
        description: request.description,
        fields: request.details,
        route: request.route,
        approval: request.approval,
        sla: request.sla,
      }),
    };
    setRequests((current) => [newRequest, ...current]);
    setSelectedRequest(newRequest);
    setActiveTab("mine");
    showToast("요청이 정상적으로 등록됐어요.");
  };

  const advanceRequest = (request: RequestItem) => {
    const nextStatus: Status = request.status === "접수" ? "처리 중" : "완료";
    setRequests((current) => current.map((item) => item.id === request.id ? {
      ...item,
      status: nextStatus,
      assignee: item.assignee === "배정 대기" ? "김민재 매니저" : item.assignee,
      updated: "방금 전",
      sla: nextStatus === "완료" ? "기한 내 완료" : item.sla,
      integration: item.integration ? {
        ...item.integration,
        workflow: { ...item.integration.workflow, status: nextStatus },
      } : undefined,
    } : item));
    showToast(nextStatus === "처리 중" ? "담당자 배정 후 처리를 시작했어요." : "요청을 완료 처리했어요.");
  };

  const requestSeat = (seat: SeatRecord) => {
    setSeats((current) => current.map((item) => item.id === seat.id ? {
      ...item,
      status: "pending",
      assignedTo: "본인",
      department: "내 소속팀",
      effectiveDate: "관리자 승인 후",
    } : item));
  };

  const assignSeat = (seat: SeatRecord, payload: { employee: string; department: string; mode: "assigned" | "reserved"; effectiveDate: string; reason: string }) => {
    setSeats((current) => current.map((item) => item.id === seat.id ? {
      ...item,
      status: payload.mode,
      assignedTo: payload.employee,
      department: payload.department,
      effectiveDate: payload.effectiveDate,
    } : item));
  };

  const releaseSeat = (seat: SeatRecord) => {
    setSeats((current) => current.map((item) => item.id === seat.id ? {
      ...item,
      status: "available",
      assignedTo: undefined,
      department: undefined,
      effectiveDate: undefined,
    } : item));
  };

  const moveSeat = (from: SeatRecord, to: SeatRecord) => {
    setSeats((current) => current.map((item) => {
      if (item.id === from.id) return { ...item, status: "available", assignedTo: undefined, department: undefined, effectiveDate: undefined };
      if (item.id === to.id) return { ...item, status: from.status === "reserved" ? "reserved" : "assigned", assignedTo: from.assignedTo, department: from.department, effectiveDate: "2026-08-18" };
      return item;
    }));
  };

  const approveSeat = (seat: SeatRecord) => {
    setSeats((current) => current.map((item) => item.id === seat.id ? { ...item, status: "assigned", effectiveDate: "2026-08-18" } : item));
  };

  const reserveSharedSeat = (seat: SeatRecord, date: string) => {
    setSeatReservations((current) => [
      ...current.filter((reservation) => !(reservation.date === date && (reservation.employee === "본인" || reservation.seatId === seat.id))),
      {
        id: `SR-${Date.now()}`,
        seatId: seat.id,
        date,
        employee: "본인",
        department: "내 소속팀",
        status: "reserved",
        createdBy: "employee",
      },
    ]);
  };

  const reserveSharedSeatForEmployee = (seat: SeatRecord, payload: SharedSeatReservationPayload) => {
    setSeatReservations((current) => [
      ...current.filter((reservation) => !(reservation.date === payload.date && (reservation.employee === payload.employee || reservation.seatId === seat.id))),
      {
        id: `SR-${Date.now()}`,
        seatId: seat.id,
        date: payload.date,
        employee: payload.employee,
        department: payload.department,
        status: "reserved",
        createdBy: "admin",
      },
    ]);
  };

  const cancelSharedSeat = (reservation: SeatReservation) => {
    setSeatReservations((current) => current.filter((item) => item.id !== reservation.id));
  };

  const updateSeatPolicy = (zoneId: string, update: SeatPolicyUpdate) => {
    const currentPolicy = seatPolicies.find((policy) => policy.zoneId === zoneId);
    if (!currentPolicy) return;

    if (update.mode === "fixed" && currentPolicy.mode === "shared") {
      const zoneSeatIds = new Set(seats.filter((seat) => seat.zoneId === zoneId).map((seat) => seat.id));
      const activeReservations = seatReservations.filter((reservation) => zoneSeatIds.has(reservation.seatId));
      if (activeReservations.length > 0) {
        showToast(`예약 ${activeReservations.length}건을 먼저 취소한 뒤 고정석으로 전환해 주세요.`);
        return;
      }
    }

    setSeatPolicies((current) => current.map((policy) => policy.zoneId === zoneId ? {
      ...policy,
      ...update,
      updatedAt: "2026-08-17",
    } : policy));

    if (update.mode && update.mode !== currentPolicy.mode) {
      const transitionNote = update.mode === "shared" ? " 기존 배정은 유지되고 빈 좌석부터 예약할 수 있어요." : "";
      showToast(`${currentPolicy.zoneLabel}를 ${update.mode === "fixed" ? "고정석" : "공유좌석"}으로 변경했어요.${transitionNote}`);
    } else {
      showToast(`${currentPolicy.zoneLabel} 정책 설정을 저장했어요.`);
    }
  };

  const bookRoom = (room: RoomRecord, payload: RoomBookingPayload) => {
    const [hour, minute] = payload.start.split(":").map(Number);
    const endMinutes = hour * 60 + minute + payload.duration;
    const end = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
    setRooms((current) => current.map((item) => item.id === room.id ? {
      ...item,
      bookings: [...item.bookings, {
        id: `B-${Date.now()}`,
        organizer: payload.organizer,
        department: payload.department,
        title: payload.title,
        date: payload.date,
        start: payload.start,
        end,
        status: payload.status,
      }],
    } : item));
  };

  const seatTotals = getSeatTotals(seats, seatPolicies, seatReservations, "2026-08-18");
  const roomStats = getRoomStats(rooms);

  return (
    <div className="page-stage">
      <div className="mobile-app-shell">
        {selectedRequest ? (
          <RequestDetailScreen request={requests.find((item) => item.id === selectedRequest.id) || selectedRequest} onBack={() => setSelectedRequest(null)} />
        ) : activeTab === "home" ? (
          <HomeScreen requests={requests} seats={seats} rooms={rooms} seatAvailability={seatTotals.available} roomAvailability={roomStats.available} onOpenRequest={openRequest} onOpenDetail={openDetail} onGoMine={() => changeTab("mine")} onOpenSeat={() => changeTab("seat")} />
        ) : activeTab === "request" ? (
          <RequestScreen
            key={`${initialCategory}:${initialRequestTypeId ?? "default"}`}
            initialCategory={initialCategory}
            initialRequestTypeId={initialRequestTypeId}
            onSubmit={addRequest}
            onBack={() => changeTab("home")}
          />
        ) : activeTab === "seat" ? (
          <><AppHeader title="좌석·공간" back onBack={() => changeTab("home")} /><SpaceEmployeeScreen seats={seats} policies={seatPolicies} reservations={seatReservations} rooms={rooms} onRequest={requestSeat} onReserveShared={reserveSharedSeat} onCancelShared={cancelSharedSeat} onBookRoom={bookRoom} onToast={showToast} /></>
        ) : activeTab === "mine" ? (
          <MyRequestsScreen requests={requests} onOpenDetail={openDetail} />
        ) : activeTab === "seatAdmin" ? (
          <><AppHeader title="좌석·공간 관리" back onBack={() => changeTab("ops")} /><SpaceAdminScreen seats={seats} policies={seatPolicies} reservations={seatReservations} rooms={rooms} onAssign={assignSeat} onRelease={releaseSeat} onMove={moveSeat} onApprove={approveSeat} onUpdatePolicy={updateSeatPolicy} onReserveShared={reserveSharedSeatForEmployee} onCancelShared={cancelSharedSeat} onBookRoom={bookRoom} onToast={showToast} /></>
        ) : activeTab === "budgetAdmin" ? (
          <><AppHeader title="예산·비용 관리" back onBack={() => changeTab("ops")} /><BudgetAdminScreen /></>
        ) : (
          <OpsScreen requests={requests} seatTotals={seatTotals} roomStats={roomStats} onAdvance={advanceRequest} onOpenSeatAdmin={() => changeTab("seatAdmin")} onOpenBudgetAdmin={() => changeTab("budgetAdmin")} />
        )}

        {!selectedRequest && activeTab !== "seatAdmin" && activeTab !== "budgetAdmin" && <BottomNavigation active={activeTab} onChange={(tab) => tab === "request" ? openRequest() : changeTab(tab)} />}
        {toast && <div className="toast" role="status"><span><Icon name="check" size={16} /></span>{toast}</div>}
      </div>
    </div>
  );
}
