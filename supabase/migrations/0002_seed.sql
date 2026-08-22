-- ============================================================
-- INOCASA / Thermomix Tunisie — catalog seed (8 real products)
-- Run this AFTER 0001_catalog.sql.
-- Idempotent: re-running updates existing rows by sku.
-- ============================================================

insert into products
  (sku, slug, name, category, price_ht, tva, price_ttc,
   short_description, description, features, included,
   source_url, in_stock, is_featured, sort_order)
values
  (
    '63151', 'thermomix-tm7', 'Thermomix® TM7', 'robot',
    4873.109, 0.19, 5799,
    'Le robot multifonction connecté qui remplace à lui seul plus de vingt appareils.',
    'Le Thermomix® TM7 est un robot multifonction connecté qui remplace à lui seul plus de vingt appareils de cuisine. Il réunit 12 fonctions et 25 modes intégrés — moudre, hacher, mijoter, fouetter, peser, émulsionner, cuire à la vapeur, mixer, réchauffer, cuire, pétrir, mélanger — pour vous accompagner à chaque étape de vos recettes.' || E'\n\n' ||
    'Son grand écran tactile guide chaque préparation pas à pas, tandis que son moteur et sa coque isolante particulièrement silencieux rendent la cuisine plus sereine, même en pleine soirée. Connecté à Cookidoo®, il propose des milliers de recettes guidées directement pilotées depuis l''appareil.' || E'\n\n' ||
    'Chaque Thermomix® TM7 vendu par INOCASA est livré avec 3 mois d''abonnement Cookidoo® offerts et bénéficie de 3 ans de garantie officielle Vorwerk.',
    ARRAY[
      '12 fonctions et 25 modes intégrés',
      'Grand écran tactile couleur',
      'Moteur et coque isolante silencieux',
      'Cuisson guidée pas à pas via Cookidoo®',
      '3 mois d''abonnement Cookidoo® offerts',
      '3 ans de garantie officielle Vorwerk'
    ],
    ARRAY[
      'Le Thermomix® TM7',
      'Le bol 2,2 L',
      'Un fouet',
      'Un gobelet doseur',
      'Une spatule',
      'Un panier cuisson',
      'L''ensemble Varoma (bol + plateau vapeur)',
      'Un couvercle',
      'Un mode d''emploi'
    ],
    'https://www.vorwerk.com/fr/fr/s/shop/thermomix-tm7',
    true, true, 0
  ),
  (
    '77352', 'thermomix-sensor', 'Thermomix® Sensor', 'accessoire',
    578.992, 0.19, 689,
    'La sonde de cuisson connectée qui mesure la température à cœur en temps réel.',
    'Le Thermomix® Sensor est une sonde de cuisson connectée qui mesure la température à cœur de vos préparations en temps réel et vous prévient dès que c''est parfaitement cuit. Fini les cuissons approximatives : un contrôle précis au degré près, que ce soit au four, à la poêle ou au barbecue.' || E'\n\n' ||
    'Sa cuisson guidée intégrée vous accompagne du début à la fin, pour des résultats justes à chaque fois, sur toutes vos viandes, poissons et préparations délicates.',
    ARRAY[
      'Mesure de température à cœur en temps réel',
      'Précision au degré près',
      'Compatible four, poêle et barbecue',
      'Cuisson guidée intégrée'
    ],
    '{}',
    'https://www.vorwerk.com/fr/fr/s/shop/sensor-thermomix',
    true, true, 1
  ),
  (
    '85316', 'sac-de-transport-tm7', 'Sac de transport Thermomix® TM7', 'accessoire',
    209.244, 0.19, 249,
    'Transportez votre Thermomix® en toute sécurité, où que vous alliez.',
    'Ce sac de transport a été conçu spécifiquement pour votre Thermomix® TM7, afin de le déplacer en toute sécurité chez des proches, en atelier culinaire ou en démonstration.' || E'\n\n' ||
    'Son rembourrage protecteur amortit les chocs, ses compartiments dédiés accueillent vos accessoires, et ses poignées renforcées facilitent le transport au quotidien.',
    ARRAY[
      'Rembourrage protecteur intégral',
      'Compartiments dédiés aux accessoires',
      'Poignées renforcées',
      'Conçu sur mesure pour le TM7'
    ],
    '{}',
    'https://www.vorwerk.com/fr/fr/s/shop/sac-transport-tm7',
    true, true, 2
  ),
  (
    '12140', 'decoupe-minute-plus-tm7', 'Découpe-Minute+ Thermomix® TM7', 'accessoire',
    629.412, 0.19, 749,
    'L''accessoire de découpe avec plusieurs disques pour trancher, râper et émincer.',
    'Le Découpe-Minute+ est livré avec plusieurs disques interchangeables — tranches fines, tranches épaisses, râpé, julienne — pour préparer vos légumes et fromages en un rien de temps.' || E'\n\n' ||
    'Un mode spécifique intégré au Thermomix® TM7 accompagne chacune des découpes, pour un résultat régulier à chaque utilisation.',
    ARRAY[
      'Plusieurs disques interchangeables',
      'Tranches fines et tranches épaisses',
      'Râpé et julienne',
      'Mode dédié intégré au TM7'
    ],
    '{}',
    'https://www.vorwerk.com/fr/fr/s/shop/decoupe-minute-tm7',
    true, true, 3
  ),
  (
    '70908', 'couvre-lame-eplucheur', 'Couvre-lame éplucheur Thermomix®', 'accessoire',
    116.807, 0.19, 139,
    'Épluchez pommes de terre et légumes directement dans le bol.',
    'Le couvre-lame éplucheur permet d''éplucher pommes de terre et légumes directement dans le bol du Thermomix®, sans risque de coupure.' || E'\n\n' ||
    'Il se fixe simplement sur le couteau et représente un gain de temps considérable en préparation, surtout pour les grandes quantités.',
    ARRAY[
      'Épluchage directement dans le bol',
      'Se fixe sur le couteau',
      'Sans risque de coupure',
      'Gain de temps en préparation'
    ],
    '{}',
    'https://www.vorwerk.com/fr/fr/s/shop/couvre-lame-eplucheur-thermomix',
    true, false, 4
  ),
  (
    '71049', 'fouet-tm7', 'Fouet Thermomix® TM7', 'accessoire',
    43.698, 0.19, 52,
    'Montez blancs en neige, chantilly, sauces et émulsions.',
    'Le fouet Thermomix® TM7 permet de monter blancs en neige, chantilly, sauces et émulsions directement dans le bol, avec une texture aérienne et régulière.' || E'\n\n' ||
    'Il se clipse facilement sur le couteau et se lave au lave-vaisselle pour un entretien simplifié.',
    ARRAY[
      'Blancs en neige et chantilly',
      'Sauces et émulsions',
      'Se clipse sur le couteau',
      'Compatible lave-vaisselle'
    ],
    '{}',
    'https://www.vorwerk.com/fr/fr/s/shop/le-fouet-tm5',
    true, false, 5
  ),
  (
    '63121', 'bol-complet-tm7', 'Bol complet Thermomix® TM7', 'accessoire',
    763.865, 0.19, 909,
    'Un deuxième bol complet pour enchaîner les préparations sans interruption.',
    'Ce bol complet 2,2 L — bol, couteau, couvercle et joint — vous permet d''enchaîner les préparations sans avoir à laver entre deux recettes.' || E'\n\n' ||
    'Idéal pour les repas à plusieurs plats ou les ateliers de cuisine, il double votre capacité de préparation au quotidien.',
    ARRAY[
      'Bol 2,2 L complet',
      'Couteau, couvercle et joint inclus',
      'Enchaînez les recettes sans laver',
      'Pièce d''origine Vorwerk'
    ],
    '{}',
    'https://www.vorwerk.com/fr/fr/s/shop/bol-complet-tm7',
    true, false, 6
  ),
  (
    '58330', 'couteaux-tm7', 'Couteaux Thermomix® TM7', 'accessoire',
    184.034, 0.19, 219,
    'Couteau de remplacement en acier inoxydable à quatre lames.',
    'Ce couteau de remplacement en acier inoxydable à quatre lames est une pièce d''origine Vorwerk, conçue pour retrouver toute la puissance de coupe et de mixage de votre Thermomix® TM7.' || E'\n\n' ||
    'Son montage est simple et rapide, sans outil supplémentaire.',
    ARRAY[
      'Acier inoxydable à quatre lames',
      'Pièce d''origine Vorwerk',
      'Montage simple, sans outil',
      'Compatible Thermomix® TM7'
    ],
    '{}',
    'https://www.vorwerk.com/fr/fr/s/shop/couteaux-tm6',
    true, false, 7
  )
on conflict (sku) do update set
  slug               = excluded.slug,
  name               = excluded.name,
  category           = excluded.category,
  price_ht           = excluded.price_ht,
  tva                = excluded.tva,
  price_ttc          = excluded.price_ttc,
  short_description  = excluded.short_description,
  description        = excluded.description,
  features           = excluded.features,
  included           = excluded.included,
  source_url         = excluded.source_url,
  in_stock           = excluded.in_stock,
  is_featured        = excluded.is_featured,
  sort_order         = excluded.sort_order;
