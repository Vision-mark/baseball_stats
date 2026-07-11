-- 權限表：一列 = 某個 email 對某支球隊擁有「輸入 / 刪除」權限
-- ⚠️ team_id 的型別要跟你 teams.id 的型別一致：
--    如果 teams.id 是 uuid，用下面這版；
--    如果 teams.id 是 int8 / bigint (預設遞增數字)，把 uuid 改成 bigint。
create table if not exists team_permissions (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  team_id uuid not null references teams(id) on delete cascade,
  created_at timestamptz default now(),
  unique (email, team_id)
);

create index if not exists idx_team_permissions_email on team_permissions (email);

-- 範例：把某個 email 加到某支球隊的權限
-- insert into team_permissions (email, team_id)
-- values ('coach.a@gmail.com', '球隊的 id 貼在這裡');

-- 之後要新增/刪除誰有權限，直接到 Supabase 後台的
-- Table Editor -> team_permissions 手動增刪一列即可，不需要改程式。
