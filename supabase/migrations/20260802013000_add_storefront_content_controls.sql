-- Dedicated, typed storefront controls backed by site_settings. Editors use
-- structured forms; the public client can read only these four approved keys.

grant select on table public.site_settings to anon;

drop policy if exists site_settings_public_storefront_read on public.site_settings;
create policy site_settings_public_storefront_read
on public.site_settings
for select
to anon, authenticated
using (setting_key in (
  'storefront.home.why_choose',
  'storefront.home.about_preview',
  'storefront.home.contact_preview',
  'storefront.brands.page'
));

insert into public.site_settings (setting_key, setting_value, description)
values
  (
    'storefront.home.why_choose',
    $json${
      "visible": true,
      "eyebrow": "Why Choose Us",
      "heading": "The OW Motors Difference",
      "cards": [
        {"id":"motorcycle-selection","icon":"shield","title":"Motorcycle Selection","description":"A focused destination for motorcycles across four distinct brands and riding styles.","visible":true,"order":0},
        {"id":"multiple-brands","icon":"star","title":"Multiple Brands","description":"Explore Taro, Lifan, Hi-Speed, and Super Star through one consistent dealership experience.","visible":true,"order":1},
        {"id":"clear-information","icon":"tag","title":"Clear Information","description":"Verified model, pricing, and availability information is presented clearly as inventory goes live.","visible":true,"order":2},
        {"id":"rider-support","icon":"headphones","title":"Rider Support","description":"A direct route to contact the OW Motors team for product guidance and purchasing information.","visible":true,"order":3},
        {"id":"direct-assistance","icon":"zap","title":"Direct Assistance","description":"Move from browsing to a dealership inquiry through a dedicated, accessible contact route.","visible":true,"order":4}
      ]
    }$json$::jsonb,
    'Homepage Why Choose section content and card presentation.'
  ),
  (
    'storefront.home.about_preview',
    $json${
      "visible": true,
      "eyebrow": "About OW Motors",
      "heading": "Your Motorcycle Destination",
      "description": "OW Motors brings Taro, Lifan, Hi-Speed, and Super Star together in one focused motorcycle experience. Production dealership details and inventory claims will be published only after verification.",
      "imagePath": "images/ow-motors-logo.png",
      "imageAlt": "OW Motors",
      "points": [
        "Motorcycles from four distinct brands",
        "A clear path from discovery to dealership contact",
        "Product information designed around rider decisions",
        "A growing catalog backed by published inventory data"
      ],
      "ctaLabel": "Learn more about us",
      "ctaHref": "/about",
      "primaryStatValue": "4",
      "primaryStatLabel": "Brands",
      "secondaryStatValue": "1",
      "secondaryStatLabel": "Rider-focused destination"
    }$json$::jsonb,
    'Homepage About preview content, image, facts, and action.'
  ),
  (
    'storefront.home.contact_preview',
    $json${
      "visible": true,
      "eyebrow": "Find Us",
      "heading": "Contact & Location",
      "location": "Production address being verified",
      "phone": "Production phone number being verified",
      "email": "info@owmotors.com",
      "openingHours": "Production opening hours being verified",
      "mapMessage": "Interactive location map coming after address verification",
      "ctaLabel": "Contact OW Motors",
      "ctaHref": "/contact"
    }$json$::jsonb,
    'Homepage contact and location preview content.'
  ),
  (
    'storefront.brands.page',
    $json${
      "eyebrow": "OW Motors",
      "heading": "Our Brands",
      "description": "Explore the motorcycle brands available at OW Motors.",
      "showcase": []
    }$json$::jsonb,
    'Brands page introduction and brand showcase visibility/order.'
  )
on conflict (setting_key) do nothing;
