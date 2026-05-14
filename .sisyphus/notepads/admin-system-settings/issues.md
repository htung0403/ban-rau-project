# Admin System Settings - Issues

## Known Issues / Blockers

### To be populated during implementation

## F4 Scope Fidelity Findings (2026-05-13)
- REJECT: Task 4 requirement "Ghi chép kết quả ... để Task 5 sử dụng" is not evidenced in implementation files; no explicit documented fallback/role API structure note found in Task 5 files.
- REJECT: Task 5 "Empty state: Nếu chưa có schedule nào, hiển thị message + nút 'Thiết lập khung giờ'" is not implemented. `LockTimeConfig.tsx` only shows "Không có vai trò nào đang hoạt động." when roles empty, and no "Thiết lập khung giờ" action for empty schedules.
- REJECT: Task 5 must-not violation: component copy states enforcement behavior ("người dùng sẽ bị từ chối truy cập") in `LockTimeConfig.tsx`, which exceeds strict UI-config-only scope language.
- REJECT: Contamination issue: `client/src/components/layout/Topbar.tsx` changed (breadcrumb label) though Task 9 scope limited wiring to App/moduleData/permission checks/sidebar check; Topbar edit is unaccounted.
- REJECT: Unaccounted change: `.sisyphus/boulder.json` modified, unrelated to deliverables.
