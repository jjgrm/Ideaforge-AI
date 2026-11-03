-- Backward-compatible single-idea reservations. No data or accounts are deleted.
begin;
create or replace function public.if_ai_claim_ideas(p_ideas jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare item jsonb; n text; ws text[]; owner uuid := auth.uid();
begin
 if owner is null then raise insufficient_privilege; end if;
 if jsonb_typeof(p_ideas) is distinct from 'array' then raise check_violation; end if;
 if jsonb_array_length(p_ideas) not between 1 and 3 then raise check_violation; end if;
 perform pg_advisory_xact_lock(829157);
 if (select count(*) from ideaforge_private.ai_seen_ideas where owner_id=owner and created_at>now()-interval '1 minute')>=18 then
  raise check_violation using message='idea_rate_limited';
 end if;
 for item in select * from jsonb_array_elements(p_ideas) loop
  if jsonb_typeof(item->'title') is distinct from 'string' or length(item->>'title') not between 5 and 200 then raise check_violation; end if;
  n=ideaforge_private.idea_normalize(item->>'title'); ws=ideaforge_private.idea_words(n);
  if exists(select 1 from ideaforge_private.ai_seen_ideas old where old.normalized=n or
    (old.words&&ws and (select count(*) from(select unnest(old.words) intersect select unnest(ws)) x)>=2 and
     (select count(*)::numeric from(select unnest(old.words) intersect select unnest(ws)) x)/greatest(1,(select count(*) from(select unnest(old.words) union select unnest(ws)) y))>=0.72)) then
   raise unique_violation;
  end if;
  insert into ideaforge_private.ai_seen_ideas(owner_id,title,normalized,words) values(owner,item->>'title',n,ws);
 end loop;
 return jsonb_build_object('accepted',true);
exception when unique_violation then return jsonb_build_object('accepted',false);
end $$;
revoke all on function public.if_ai_claim_ideas(jsonb) from public,anon,authenticated;
grant execute on function public.if_ai_claim_ideas(jsonb) to authenticated;
notify pgrst,'reload schema';
commit;

