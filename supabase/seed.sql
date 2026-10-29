-- Generated from data/catalog.json. Source metadata is private; every record remains a sample.
-- Existing catalog records are never overwritten. Review and publish separately.
begin;
set local standard_conforming_strings = on;

insert into public.products (code, slug, category, publication_status, verification_status, availability, currency, image_path)
values ('TT-001', 'saddle-blue-border', 'saddles', 'sample', 'needs_review', 'unverified', 'MNT', '/images/catalog/tt-001.jpg')
on conflict (code) do nothing;

insert into public.product_translations (product_id, locale, name, description, observations, publication_status)
select id, 'mn', 'Улаан суудалтай, цэнхэр хүрээтэй эмээл', 'Улаан суудал, цэнхэр хүрээ, дугуй хээт чимэглэл бүхий эмээлийн жишиг бүртгэл.', 'Сийлбэртэй тавиур дээр байрлуулсан. Гөлөмний ирмэгт цэнхэр, улаан хүрээ харагдана.', 'draft'
from public.products where code = 'TT-001' and publication_status = 'sample'
on conflict (product_id, locale) do nothing;

insert into public.product_translations (product_id, locale, name, description, observations, publication_status)
select id, 'en', 'Red-seat saddle with blue edging', 'A sample saddle record with a red seat, blue edging and round decorative details.', 'Shown on a carved display stand. Blue and red borders are visible around the flaps.', 'draft'
from public.products where code = 'TT-001' and publication_status = 'sample'
on conflict (product_id, locale) do nothing;

insert into private.product_details (product_id, source_file_name, source_url, source_folder_url, needs_confirmation)
select id, 'EXA_7800.jpg', 'https://drive.google.com/file/d/1Jn3Oa0rfJS5nZEI7h67HWP8g04vNmP5e/view', 'https://drive.google.com/drive/folders/1gZ-az3LLwgJfYaQowQJlOXje1mdSffTR', '["Албан ёсны нэр ба барааны дугаар","Тусдаа бодит эдлэл мөн эсэх","Материал, сорьц ба чулууны мэдээлэл","Хэмжээс ба жин","Урлаач, гарал үүсэл ба он цаг","Үнэ ба одоогийн бэлэн байдал","Зурагт харагдах дагалдах зүйл багтах эсэх"]'::jsonb
from public.products where code = 'TT-001' and publication_status = 'sample'
on conflict (product_id) do nothing;

insert into public.products (code, slug, category, publication_status, verification_status, availability, currency, image_path)
values ('TT-002', 'saddle-multicolour-border', 'saddles', 'sample', 'needs_review', 'unverified', 'MNT', '/images/catalog/tt-002.jpg')
on conflict (code) do nothing;

insert into public.product_translations (product_id, locale, name, description, observations, publication_status)
select id, 'mn', 'Олон өнгийн хүрээтэй, шаргал гөлөмтэй эмээл', 'Шаргал гөлөм, олон өнгийн хүрээ, цайвар дугуй чимэглэлтэй эмээлийн жишиг бүртгэл.', 'Урд хэсэгт олон өнгийн зурвас, шаргал хавтгай дээр бараан хээ харагдана.', 'draft'
from public.products where code = 'TT-002' and publication_status = 'sample'
on conflict (product_id, locale) do nothing;

insert into public.product_translations (product_id, locale, name, description, observations, publication_status)
select id, 'en', 'Saddle with multicolour edging and tan flaps', 'A sample saddle record with tan flaps, multicolour edging and pale round ornaments.', 'Multicolour bands appear on the front, with dark patterns over the tan flaps.', 'draft'
from public.products where code = 'TT-002' and publication_status = 'sample'
on conflict (product_id, locale) do nothing;

insert into private.product_details (product_id, source_file_name, source_url, source_folder_url, needs_confirmation)
select id, 'EXA_7843.jpg', 'https://drive.google.com/file/d/1at0_MxQ53KZfW06iVndFR568-2DIpdY7/view', 'https://drive.google.com/drive/folders/1gZ-az3LLwgJfYaQowQJlOXje1mdSffTR', '["Албан ёсны нэр ба барааны дугаар","Тусдаа бодит эдлэл мөн эсэх","Материал, сорьц ба чулууны мэдээлэл","Хэмжээс ба жин","Урлаач, гарал үүсэл ба он цаг","Үнэ ба одоогийн бэлэн байдал","Зурагт харагдах дагалдах зүйл багтах эсэх"]'::jsonb
from public.products where code = 'TT-002' and publication_status = 'sample'
on conflict (product_id) do nothing;

insert into public.products (code, slug, category, publication_status, verification_status, availability, currency, image_path)
values ('TT-003', 'saddle-dark-border', 'saddles', 'sample', 'needs_review', 'unverified', 'MNT', '/images/catalog/tt-003.jpg')
on conflict (code) do nothing;

insert into public.product_translations (product_id, locale, name, description, observations, publication_status)
select id, 'mn', 'Хар хүрээтэй, улаан суудалтай эмээл', 'Улаан суудал, бараан хүрээ, шаргал гөлөмтэй эмээлийн жишиг бүртгэл.', 'Урд хэсгийн дугуй чимэглэл, төв хавтасны сүлжээ хэлбэрийн хээ харагдана.', 'draft'
from public.products where code = 'TT-003' and publication_status = 'sample'
on conflict (product_id, locale) do nothing;

insert into public.product_translations (product_id, locale, name, description, observations, publication_status)
select id, 'en', 'Red-seat saddle with dark edging', 'A sample saddle record with a red seat, dark edging and tan flaps.', 'Round front ornaments and a lattice-like pattern on the central flap are visible.', 'draft'
from public.products where code = 'TT-003' and publication_status = 'sample'
on conflict (product_id, locale) do nothing;

insert into private.product_details (product_id, source_file_name, source_url, source_folder_url, needs_confirmation)
select id, 'EXA_7861.jpg', 'https://drive.google.com/file/d/1Etg3nd5AmU6xoPf8qQcHLHwYhxFGGi-e/view', 'https://drive.google.com/drive/folders/1gZ-az3LLwgJfYaQowQJlOXje1mdSffTR', '["Албан ёсны нэр ба барааны дугаар","Тусдаа бодит эдлэл мөн эсэх","Материал, сорьц ба чулууны мэдээлэл","Хэмжээс ба жин","Урлаач, гарал үүсэл ба он цаг","Үнэ ба одоогийн бэлэн байдал","Зурагт харагдах дагалдах зүйл багтах эсэх"]'::jsonb
from public.products where code = 'TT-003' and publication_status = 'sample'
on conflict (product_id) do nothing;

insert into public.products (code, slug, category, publication_status, verification_status, availability, currency, image_path)
values ('TT-004', 'saddle-green-flaps', 'saddles', 'sample', 'needs_review', 'unverified', 'MNT', '/images/catalog/tt-004.jpg')
on conflict (code) do nothing;

insert into public.product_translations (product_id, locale, name, description, observations, publication_status)
select id, 'mn', 'Ногоон гөлөмтэй эмээл', 'Ногоон гөлөм, улаан суудал, хээт хүрээтэй эмээлийн жишиг бүртгэл.', 'Ногоон дэвсгэр дээр бараан болон цайвар хээ, хоёр талд урт уяа харагдана.', 'draft'
from public.products where code = 'TT-004' and publication_status = 'sample'
on conflict (product_id, locale) do nothing;

insert into public.product_translations (product_id, locale, name, description, observations, publication_status)
select id, 'en', 'Saddle with green flaps', 'A sample saddle record with green flaps, a red seat and patterned borders.', 'Dark and pale details contrast with the green background; long ties hang at both sides.', 'draft'
from public.products where code = 'TT-004' and publication_status = 'sample'
on conflict (product_id, locale) do nothing;

insert into private.product_details (product_id, source_file_name, source_url, source_folder_url, needs_confirmation)
select id, 'EXA_7893.jpg', 'https://drive.google.com/file/d/1Kk2iDjw3q-D9NO4YSouPmj_Z4VQ2lm8q/view', 'https://drive.google.com/drive/folders/1gZ-az3LLwgJfYaQowQJlOXje1mdSffTR', '["Албан ёсны нэр ба барааны дугаар","Тусдаа бодит эдлэл мөн эсэх","Материал, сорьц ба чулууны мэдээлэл","Хэмжээс ба жин","Урлаач, гарал үүсэл ба он цаг","Үнэ ба одоогийн бэлэн байдал","Зурагт харагдах дагалдах зүйл багтах эсэх"]'::jsonb
from public.products where code = 'TT-004' and publication_status = 'sample'
on conflict (product_id) do nothing;

insert into public.products (code, slug, category, publication_status, verification_status, availability, currency, image_path)
values ('TT-005', 'saddle-burgundy-flaps', 'saddles', 'sample', 'needs_review', 'unverified', 'MNT', '/images/catalog/tt-005.jpg')
on conflict (code) do nothing;

insert into public.product_translations (product_id, locale, name, description, observations, publication_status)
select id, 'mn', 'Улаан хүрэн гөлөмтэй эмээл', 'Улаан хүрэн гөлөм, ногоон хүрээ, цайвар чимэглэлтэй эмээлийн жишиг бүртгэл.', 'Улаан хүрэн гөлөмний ирмэгт олон өнгийн хүрээ, урд дээд хэсэгт ногоон эмжээр харагдана.', 'draft'
from public.products where code = 'TT-005' and publication_status = 'sample'
on conflict (product_id, locale) do nothing;

insert into public.product_translations (product_id, locale, name, description, observations, publication_status)
select id, 'en', 'Saddle with burgundy flaps', 'A sample saddle record with burgundy flaps, green edging and pale ornaments.', 'Multicolour borders frame the burgundy flaps, and green trim outlines the raised front.', 'draft'
from public.products where code = 'TT-005' and publication_status = 'sample'
on conflict (product_id, locale) do nothing;

insert into private.product_details (product_id, source_file_name, source_url, source_folder_url, needs_confirmation)
select id, 'EXA_7902.jpg', 'https://drive.google.com/file/d/1VA6-brIc3TciUSW2xjPM95CMwMwIAht7/view', 'https://drive.google.com/drive/folders/1gZ-az3LLwgJfYaQowQJlOXje1mdSffTR', '["Албан ёсны нэр ба барааны дугаар","Тусдаа бодит эдлэл мөн эсэх","Материал, сорьц ба чулууны мэдээлэл","Хэмжээс ба жин","Урлаач, гарал үүсэл ба он цаг","Үнэ ба одоогийн бэлэн байдал","Зурагт харагдах дагалдах зүйл багтах эсэх"]'::jsonb
from public.products where code = 'TT-005' and publication_status = 'sample'
on conflict (product_id) do nothing;

insert into public.products (code, slug, category, publication_status, verification_status, availability, currency, image_path)
values ('TT-006', 'bowl-orange-band', 'vessels', 'sample', 'needs_review', 'unverified', 'MNT', '/images/catalog/tt-006.jpg')
on conflict (code) do nothing;

insert into public.product_translations (product_id, locale, name, description, observations, publication_status)
select id, 'mn', 'Улбар хүрээтэй, хээт суурьтай аяга', 'Улбар өнгийн бүслүүр, давхар хээт хэсэг, дугуй суурьтай аяганы жишиг бүртгэл.', 'Дэлбэгэр амсар, улбар зурвас, суурийн дээрх мушгиа хэлбэрийн хээ харагдана.', 'draft'
from public.products where code = 'TT-006' and publication_status = 'sample'
on conflict (product_id, locale) do nothing;

insert into public.product_translations (product_id, locale, name, description, observations, publication_status)
select id, 'en', 'Bowl with an orange band and patterned foot', 'A sample bowl record with an orange band, layered decorative details and a round foot.', 'A flared rim, orange band and scrolling details above the foot are visible.', 'draft'
from public.products where code = 'TT-006' and publication_status = 'sample'
on conflict (product_id, locale) do nothing;

insert into private.product_details (product_id, source_file_name, source_url, source_folder_url, needs_confirmation)
select id, 'EXA_8478.jpg', 'https://drive.google.com/file/d/1WwJa8LV_fx9QDJZFD08JnJwFLwcDVRzw/view', 'https://drive.google.com/drive/folders/1u2QeqHBCaLOhaT0V-4OGwon3B-vASTBN', '["Албан ёсны нэр ба барааны дугаар","Тусдаа бодит эдлэл мөн эсэх","Материал, сорьц ба чулууны мэдээлэл","Хэмжээс ба жин","Урлаач, гарал үүсэл ба он цаг","Үнэ ба одоогийн бэлэн байдал","Зурагт харагдах дагалдах зүйл багтах эсэх"]'::jsonb
from public.products where code = 'TT-006' and publication_status = 'sample'
on conflict (product_id) do nothing;

insert into public.products (code, slug, category, publication_status, verification_status, availability, currency, image_path)
values ('TT-007', 'bowl-geometric-base', 'vessels', 'sample', 'needs_review', 'unverified', 'MNT', '/images/catalog/tt-007.jpg')
on conflict (code) do nothing;

insert into public.product_translations (product_id, locale, name, description, observations, publication_status)
select id, 'mn', 'Сүлжээ хээтэй суурь бүхий аяга', 'Дугуй сууриа харуулсан, сүлжээ болон мушгиа хээтэй аяганы жишиг бүртгэл.', 'Зураг нь аяганы ёроолыг харуулна. Төвдөө дугуй, дөрвөн талдаа өнцөглөсөн давтагдах хээтэй.', 'draft'
from public.products where code = 'TT-007' and publication_status = 'sample'
on conflict (product_id, locale) do nothing;

insert into public.product_translations (product_id, locale, name, description, observations, publication_status)
select id, 'en', 'Bowl with a geometric patterned base', 'A sample bowl record shown from underneath, with geometric and scrolling patterns.', 'The photo shows the underside. A circular centre is surrounded by repeated angular and scrolling details.', 'draft'
from public.products where code = 'TT-007' and publication_status = 'sample'
on conflict (product_id, locale) do nothing;

insert into private.product_details (product_id, source_file_name, source_url, source_folder_url, needs_confirmation)
select id, 'EXA_8514.jpg', 'https://drive.google.com/file/d/1T1K9gW-NLfiK0avQKyGGE8siZGcqYy6Q/view', 'https://drive.google.com/drive/folders/1u2QeqHBCaLOhaT0V-4OGwon3B-vASTBN', '["Албан ёсны нэр ба барааны дугаар","Тусдаа бодит эдлэл мөн эсэх","Материал, сорьц ба чулууны мэдээлэл","Хэмжээс ба жин","Урлаач, гарал үүсэл ба он цаг","Үнэ ба одоогийн бэлэн байдал","Зурагт харагдах дагалдах зүйл багтах эсэх"]'::jsonb
from public.products where code = 'TT-007' and publication_status = 'sample'
on conflict (product_id) do nothing;

insert into public.products (code, slug, category, publication_status, verification_status, availability, currency, image_path)
values ('TT-008', 'bowl-wide-tan-band', 'vessels', 'sample', 'needs_review', 'unverified', 'MNT', '/images/catalog/tt-008.jpg')
on conflict (code) do nothing;

insert into public.product_translations (product_id, locale, name, description, observations, publication_status)
select id, 'mn', 'Өргөн шаргал бүслүүртэй аяга', 'Өргөн шаргал бүслүүр, мушгиа хэлбэрийн чимэглэл, дугуй суурьтай аяганы жишиг бүртгэл.', 'Шаргал бүслүүр дээр толбо, судал мэт өнгөний ялгарал харагдана. Материал нь баталгаажаагүй.', 'draft'
from public.products where code = 'TT-008' and publication_status = 'sample'
on conflict (product_id, locale) do nothing;

insert into public.product_translations (product_id, locale, name, description, observations, publication_status)
select id, 'en', 'Bowl with a wide tan band', 'A sample bowl record with a wide tan band, scrolling decoration and a round foot.', 'The tan band shows mottled and streaked colour variation. Its material has not been verified.', 'draft'
from public.products where code = 'TT-008' and publication_status = 'sample'
on conflict (product_id, locale) do nothing;

insert into private.product_details (product_id, source_file_name, source_url, source_folder_url, needs_confirmation)
select id, 'EXA_8553.jpg', 'https://drive.google.com/file/d/1iyOEZfzjAtGAds07TwAfjLx14KDmsl0z/view', 'https://drive.google.com/drive/folders/1u2QeqHBCaLOhaT0V-4OGwon3B-vASTBN', '["Албан ёсны нэр ба барааны дугаар","Тусдаа бодит эдлэл мөн эсэх","Материал, сорьц ба чулууны мэдээлэл","Хэмжээс ба жин","Урлаач, гарал үүсэл ба он цаг","Үнэ ба одоогийн бэлэн байдал","Зурагт харагдах дагалдах зүйл багтах эсэх"]'::jsonb
from public.products where code = 'TT-008' and publication_status = 'sample'
on conflict (product_id) do nothing;

insert into public.products (code, slug, category, publication_status, verification_status, availability, currency, image_path)
values ('TT-009', 'bowl-low-orange-band', 'vessels', 'sample', 'needs_review', 'unverified', 'MNT', '/images/catalog/tt-009.jpg')
on conflict (code) do nothing;

insert into public.product_translations (product_id, locale, name, description, observations, publication_status)
select id, 'mn', 'Намхан их биетэй, улбар хүрээтэй аяга', 'Намхан их бие, нарийн улбар бүслүүр, өргөн дугуй суурьтай аяганы жишиг бүртгэл.', 'Амсар доорх хэсэг толигор, суурийн дээгүүр жижиг давтагдах хээтэй харагдана.', 'draft'
from public.products where code = 'TT-009' and publication_status = 'sample'
on conflict (product_id, locale) do nothing;

insert into public.product_translations (product_id, locale, name, description, observations, publication_status)
select id, 'en', 'Low-profile bowl with an orange band', 'A sample low-profile bowl record with a narrow orange band and a broad round foot.', 'The area beneath the rim appears smooth, with small repeated details above the foot.', 'draft'
from public.products where code = 'TT-009' and publication_status = 'sample'
on conflict (product_id, locale) do nothing;

insert into private.product_details (product_id, source_file_name, source_url, source_folder_url, needs_confirmation)
select id, 'EXA_8597.jpg', 'https://drive.google.com/file/d/1nSXEyPcPInUr3X-f5Fy0M1PyeArn7sxb/view', 'https://drive.google.com/drive/folders/1u2QeqHBCaLOhaT0V-4OGwon3B-vASTBN', '["Албан ёсны нэр ба барааны дугаар","Тусдаа бодит эдлэл мөн эсэх","Материал, сорьц ба чулууны мэдээлэл","Хэмжээс ба жин","Урлаач, гарал үүсэл ба он цаг","Үнэ ба одоогийн бэлэн байдал","Зурагт харагдах дагалдах зүйл багтах эсэх"]'::jsonb
from public.products where code = 'TT-009' and publication_status = 'sample'
on conflict (product_id) do nothing;

insert into public.products (code, slug, category, publication_status, verification_status, availability, currency, image_path)
values ('TT-010', 'bowl-dark-surface', 'vessels', 'sample', 'needs_review', 'unverified', 'MNT', '/images/catalog/tt-010.jpg')
on conflict (code) do nothing;

insert into public.product_translations (product_id, locale, name, description, observations, publication_status)
select id, 'mn', 'Бараан гадаргуутай, хээт бүслүүртэй аяга', 'Бараан гадаргуу, шаргал бүслүүр, хээт доод хэсэгтэй аяганы жишиг бүртгэл.', 'Дэлбэгэр амсар, бараан дээд хэсэг, шаргал нарийн зурвас, дугуй суурь харагдана.', 'draft'
from public.products where code = 'TT-010' and publication_status = 'sample'
on conflict (product_id, locale) do nothing;

insert into public.product_translations (product_id, locale, name, description, observations, publication_status)
select id, 'en', 'Dark-surfaced bowl with a patterned band', 'A sample bowl record with a dark surface, tan band and decorated lower section.', 'A flared rim, dark upper section, narrow tan band and round foot are visible.', 'draft'
from public.products where code = 'TT-010' and publication_status = 'sample'
on conflict (product_id, locale) do nothing;

insert into private.product_details (product_id, source_file_name, source_url, source_folder_url, needs_confirmation)
select id, 'EXA_8634.jpg', 'https://drive.google.com/file/d/1ucYQHJOK0uzz4Tr2KvhrCHBZTdyQ3hpm/view', 'https://drive.google.com/drive/folders/1u2QeqHBCaLOhaT0V-4OGwon3B-vASTBN', '["Албан ёсны нэр ба барааны дугаар","Тусдаа бодит эдлэл мөн эсэх","Материал, сорьц ба чулууны мэдээлэл","Хэмжээс ба жин","Урлаач, гарал үүсэл ба он цаг","Үнэ ба одоогийн бэлэн байдал","Зурагт харагдах дагалдах зүйл багтах эсэх"]'::jsonb
from public.products where code = 'TT-010' and publication_status = 'sample'
on conflict (product_id) do nothing;

commit;
