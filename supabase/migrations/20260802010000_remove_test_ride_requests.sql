-- OW Motors does not offer test rides. Remove the retired lead workflow and
-- its stored submissions so no public or staff client can access it.

drop table if exists public.test_ride_requests;
