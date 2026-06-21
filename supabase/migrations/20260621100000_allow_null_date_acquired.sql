-- Allow inventory items to have no date acquired (optional for stockpile/office supplies).
alter table public.inventory
  alter column date_acquired drop not null;
