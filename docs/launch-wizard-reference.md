# Stampeo launch wizard, v3

This supersedes v2. Changes from v2 are summarised at the bottom.

Route prefix: `/onboarding/business/[<chapter>[/<sub-step>]]`. Single-sub-step chapters use `/<chapter>`; multi-sub-step chapters use `/<chapter>/<sub-step>`.

URL gate: while `businesses.settings.setup_progress.completed_at == null` for an owner, every dashboard route redirects here. Required floor stays at **3 sub-steps**: `business/identity`, `program`, `design/branding`.

---

## Global copy

### Footer

| Key | EN | FR |
|---|---|---|
| `back` | Back | Retour |
| `skip` | Skip | Passer |
| `next` | Continue | Continuer |
| `finish` | Launch my program | Lancer mon programme |
| `saving` | Saving… | Enregistrement… |
| `skipAll` | Skip rest of setup | Passer le reste de la configuration |
| `gotIt` | Got it, let's go | Compris, on y va |

`next` lost the "Save &" prefix since saving is implicit. `finish` is now a celebration of what they actually built.

### Errors (toasts)

Unchanged from v2.

| Key | EN | FR |
|---|---|---|
| `unknownStep` | We couldn't find that setup step. Take me back to the start. | Cette étape de configuration est introuvable. Retour au début. |
| `slugTaken` | That web address is already taken. | Cette adresse est déjà prise. |
| `slugInvalid` | Use lowercase letters, numbers, and hyphens only. | Lettres minuscules, chiffres et tirets uniquement. |
| `nameRequired` | Give your business a name. | Donnez un nom à votre commerce. |
| `createFailed` | Something went wrong creating your business. Please try again. | Une erreur est survenue à la création de votre commerce. Réessayez. |
| `saveFailed` | Couldn't save. Please try again. | Impossible d'enregistrer. Réessayez. |
| `programNameRequired` | Give your program a name. | Donnez un nom à votre programme. |
| `rewardRequired` | Set the reward customers will earn. | Indiquez la récompense que les clients gagneront. |

---

## Chapter 1, Welcome `/welcome` (skippable)

| Key | EN | FR |
|---|---|---|
| title | Welcome to Stampeo | Bienvenue sur Stampeo |
| subtitle | In a few minutes, your loyalty card lands in your customers' wallets. | En quelques minutes, votre carte de fidélité arrive dans le wallet de vos clients. |
| body | We'll build a branded digital card, send a stamp to your own phone, then push a broadcast to it so you feel exactly what your customers will. The required steps get you live. Everything else makes your program more polished from day one. | On crée une carte à vos couleurs, on envoie un tampon sur votre téléphone, puis on y pousse une diffusion pour que vous viviez exactement ce que vos clients vivront. Les étapes obligatoires vous mettent en ligne. Le reste rend votre programme plus abouti dès le premier jour. |
| cta (footer override) | Let's go | C'est parti |

---

## Chapter 2, About your business `/business/...`

Chapter title: EN **About your business**, FR **Votre commerce**.

### 2.1 `business/identity`, **REQUIRED**

**Data captured:** unchanged.

| Key | EN | FR |
|---|---|---|
| title | Identity | Identité |
| subtitle | Tell us what your business is called and where to find it. | Indiquez le nom de votre commerce et son adresse. |
| fields.name | Business name | Nom du commerce |
| fields.namePlaceholder | e.g. Café du Coin | ex. Café du Coin |
| fields.slug | Web address | Adresse web |
| fields.slugHelp | Your card link will be stampeo.app/{slug} | Le lien de votre carte sera stampeo.app/{slug} |
| fields.slugPlaceholder | cafe-du-coin | cafe-du-coin |
| fields.website | Website (optional) | Site web (optionnel) |
| fields.websitePlaceholder | https://… | https://… |
| fields.logo | Logo | Logo |
| fields.logoHelp | Up to 3:1 wide. | Jusqu'à un ratio de 3:1. |

### 2.2 `business/profile`, skippable

Single screen with four chip groups (type, size, locations, goal). Picking the **Other** chip in the type group reveals a free-text input bound to `settings.business_type_other`.

| Key | EN | FR |
|---|---|---|
| title | Tell us about your business | Parlez-nous de votre commerce |
| subtitle | Four quick questions so we can tune templates, recommendations, and metrics to fit. | Quatre questions rapides pour adapter les modèles, recommandations et statistiques à votre activité. |
| typeLabel | What kind of business? | Quel type de commerce ? |
| sizeLabel | How big is your team? | Quelle est la taille de votre équipe ? |
| locationsLabel | How many locations? | Combien d'établissements ? |
| goalLabel | What's your main goal? | Quel est votre objectif principal ? |
| otherFreeText | Other (tell us) | Autre (précisez) |
| otherPlaceholder | Briefly describe what you do | Décrivez brièvement votre activité |

**Type chips:** Café (Café / Salon de thé), Restaurant, Bakery / Pastry (Boulangerie / Pâtisserie), Beauty / Hair (Beauté / Coiffure), Retail / Boutique (Boutique / Commerce), Fitness / Studio, Services, Other (Autre).

**Size chips:** Just me (Juste moi), 2 to 5 (2 à 5 personnes), 6 to 20 (6 à 20 personnes), 20+ (Plus de 20).

**Locations chips:** Just one (Un seul), 2 to 5 (2 à 5), 6 to 20 (6 à 20), 20+ (Plus de 20).

**Goal chips:** see v2, unchanged.

---

## Chapter 3, Program `/program`, **REQUIRED**

| Key | EN | FR |
|---|---|---|
| title | Set up your loyalty program | Configurez votre programme |
| subtitle | How many stamps it takes, and what your customers earn. | Combien de tampons sont nécessaires, et ce que vos clients gagnent. |

---

## Chapter 4, Data collection `/data-collection`, skippable

| Key | EN | FR |
|---|---|---|
| title | What to collect from customers | Que collecter auprès des clients |
| subtitle | Pick the fields you want on the signup form. | Choisissez les champs du formulaire d'inscription. |

---

## Chapter 5, Card back `/card-back/...`

Chapter title: EN **The back of your card**, FR **Le verso de votre carte**.

### 5.1 `card-back/intro`, skippable, no form

Footer override: `gotIt`. One illustration (a card flipping to reveal hours, address, website), one paragraph, one CTA.

| Key | EN | FR |
|---|---|---|
| title | Your card has two sides | Votre carte a deux faces |
| subtitle | The front holds stamps. The back holds the practical stuff. | La face avant porte les tampons. Le verso contient les infos pratiques. |
| body | When customers tap the three dots on the card in Apple Wallet (or the i icon on Google Wallet), they see your business info: hours, address, phone, website, terms and conditions, and anything else worth showing. You set it once here, and it appears on every design of your card. The next step lets you hide specific entries per design. | Quand vos clients tapent les trois points sur leur carte dans Apple Wallet (ou l'icône i sur Google Wallet), ils voient les infos de votre commerce : horaires, adresse, téléphone, site web, conditions générales, et tout ce qui mérite d'être affiché. Vous les définissez ici une seule fois, et elles apparaissent sur chaque design de votre carte. L'étape suivante vous permet d'en cacher certaines par design. |

Updated to name the Apple "three dots" gesture, include terms and conditions in the list, and frame "designs" as variants of the same card.

### 5.2 `card-back/info`, skippable, form

| Key | EN | FR |
|---|---|---|
| title | Add your business info | Ajoutez les infos de votre commerce |
| subtitle | Phone, address, hours, website, terms and conditions, anything else worth showing. We pre-filled what we could from your account. | Téléphone, adresse, horaires, site web, conditions générales, tout ce qui mérite d'être affiché. On a pré-rempli ce qu'on pouvait depuis votre compte. |

---

## Chapter 6, Design `/design/...`

Chapter title: EN **Brand your card**, FR **Personnalisez votre carte**.

| Substep | EN title | EN subtitle | FR title | FR subtitle |
|---|---|---|---|---|
| 6.1 branding (REQ) | Logo and colors | Drop your logo, pick your colors. The defaults work; refine whenever you want. | Logo et couleurs | Ajoutez votre logo, choisissez vos couleurs. Les valeurs par défaut fonctionnent, vous pourrez affiner quand vous voulez. |
| 6.2 stamps | Stamps | Pick stamp and reward icons, then tune their colors. | Tampons | Choisissez les icônes de tampon et de récompense, puis ajustez les couleurs. |
| 6.3 content | Extra info on the front | Limit, expiry, anything else worth surfacing on the card itself. | Infos en façade | Limite, expiration, ou toute autre info utile à afficher directement sur la carte. |
| 6.4 back | What appears on the back of THIS design | Hide specific business info entries for this design, or add fields that only apply to it. | Ce qui apparaît au dos de CE design | Cachez des entrées spécifiques sur ce design, ou ajoutez des champs qui ne valent que pour lui. |

---

## Chapter 7, Notification icon `/notifications/icon`, skippable

Subtitle now sets up the concept of automatic notifications, so that when the stamp lands on the owner's phone in Chapter 8, they already know that's coming from this system.

| Key | EN | FR |
|---|---|---|
| title | Pick the icon for notifications | Choisissez l'icône des notifications |
| subtitle | Customers receive a push every time you stamp them or they earn a reward. This icon shows next to each one, so most owners use their logo. | Vos clients reçoivent un push à chaque tampon ou récompense gagnée. Cette icône apparaît à côté de chacun, alors la plupart des commerçants utilisent leur logo. |

Transactional message editing and milestone setup are deferred to the dashboard. Chapter 8.2 surfaces this with a contextual hint right after the owner sees a real stamp push.

---

## Chapter 8, Take it for a spin `/first-stamp/...`

**Combines former Chapters 8 and 9.** One narrative: install your card, then send yourself a real stamp.

Chapter title: EN **Take it for a spin**, FR **Faites le test**.

Chapter intro line (shown in the chapter header above both substeps): EN "Install your card, then send yourself a real stamp." / FR "Installez votre carte, puis envoyez-vous un vrai tampon."

### 8.1 `first-stamp/install`, skippable

**Purpose:** Get a card installed on a real phone. Identical mechanic to former Chapter 8 (signup URL + QR + quick-install + auto-detection).

| Key | EN | FR |
|---|---|---|
| title | Get a card on a phone | Mettez une carte sur un téléphone |
| subtitle | Yours or a real customer's. The next step needs a card installed somewhere. | La vôtre ou celle d'un vrai client. L'étape suivante nécessite qu'une carte soit installée quelque part. |
| explanation | This is the public page your customers will land on. Share the link in your bio or socials, print the QR at your counter, or open it on your own phone to install your first card right now. | Voici la page publique sur laquelle vos clients arriveront. Partagez le lien dans votre bio ou réseaux, imprimez le QR à votre comptoir, ou ouvrez-le sur votre téléphone pour installer votre première carte maintenant. |
| signupUrlLabel | Customer page | Page client |
| copy / copied | Copy / Copied | Copier / Copié |
| qrTitle | Print or display this QR | Imprimez ou affichez ce QR |
| qrBody | Stick it at your point of sale, drop it on a menu, or scan it with your own phone to register as your first customer. | Collez-le à votre point de vente, glissez-le sur votre menu, ou scannez-le avec votre téléphone pour vous enregistrer comme premier client. |
| quickInstallTitle | Install on your own phone | Installer sur votre téléphone |
| quickInstallBody | Fastest path. We register you using your account details and hand you the wallet buttons. | Le plus rapide. On vous enregistre avec les infos de votre compte et on vous donne les boutons wallet. |
| quickInstallCta | Use my info and install | Utiliser mes infos et installer |
| registering | Registering… | Enregistrement… |
| installTitle | Add the card to your wallet | Ajoutez la carte à votre wallet |
| installBody | Tap a button below. The card lands in your wallet, ready for the test stamp on the next step. | Tapez un bouton ci-dessous. La carte arrive dans votre wallet, prête pour le tampon test à l'étape suivante. |
| addToAppleWallet | Add to Apple Wallet | Ajouter à Apple Wallet |
| addToGoogleWallet | Add to Google Wallet | Ajouter à Google Wallet |
| pollingHint | Keep this tab open. We detect the signup automatically. | Gardez cet onglet ouvert. On détecte l'inscription automatiquement. |
| watchingInstall | Customer detected. Waiting for the card to land in your wallet… | Client détecté. On attend que la carte arrive dans votre wallet… |
| manualConfirmCta | I've added it to my wallet | Je l'ai ajoutée à mon wallet |
| detected | Card installed. Moving on in a moment. | Carte installée. On passe à la suite dans un instant. |

### 8.2 `first-stamp/stamp`, skippable

**Purpose:** Same mechanic as former Chapter 9 (real stamps, 20s cooldown, APNs push). New `customisationHint` is rendered after the first successful stamp lands, surfacing where notification customisation lives.

| Key | EN | FR |
|---|---|---|
| title | Stamp yourself | Tamponnez-vous |
| subtitle | Every tap fires a real push to your phone. | Chaque tap envoie un vrai push sur votre téléphone. |
| prereqTitle | Install your card first | Installez d'abord votre carte |
| prereqBody | Go back to the previous step and add the card to your wallet. Without it, no push lands. | Revenez à l'étape précédente et ajoutez la carte à votre wallet. Sans elle, aucun push ne peut arriver. |
| readyTitle | Ready to stamp | Prêt à tamponner |
| readyBody | Tap below. We fire a real stamp; your phone buzzes within a few seconds. | Tapez ci-dessous. Un vrai tampon part, votre téléphone vibre en quelques secondes. |
| keepStampingTitle | Stamp again | Encore un tampon ? |
| keepStampingBody | Each tap fires another real push. Try a few; see how the messages flow on your phone. | Chaque tap envoie un vrai push. Essayez-en plusieurs, voyez le rythme des messages sur votre téléphone. |
| sendCta | Send the test stamp | Envoyer le tampon test |
| sendAnotherCta | Send another stamp | Envoyer un autre tampon |
| watching | Watching for the stamp… | On surveille votre tampon… |
| cooldownCta | Wait {seconds}s for the next banner… | Attendez {seconds}s pour la prochaine notif… |
| bypassCooldown | Stamp anyway (banner may not show) | Tamponner quand même (sans notif garantie) |
| coalesceHint | Apple Wallet groups rapid pass updates. Leave roughly 20s between stamps so each one buzzes your lock screen. | Apple Wallet regroupe les mises à jour rapides. Laissez environ 20s entre les tampons pour que chacun vibre votre écran. |
| stampsLabel | Stamps on your card | Tampons sur votre carte |
| justStamped | Stamp added | Tampon ajouté |
| fallback | No buzz yet? Push can take a few seconds. Try again in a moment. | Pas de vibration ? Le push peut prendre quelques secondes. Réessayez dans un instant. |
| customisationHint | The text of that message? You can change it, add more at specific stamp counts, or turn them off. All from the notifications page in your dashboard later. | Le texte de ce message ? Vous pouvez le modifier, en ajouter à des étapes précises, ou les désactiver. Tout se passe dans la page notifications de votre dashboard plus tard. |

`customisationHint` appears once, fading in after the first successful stamp (sized as a small callout, not a modal). No plan mention. It's a discovery nudge, not a paywall.

---

## Chapter 9, First broadcast `/first-broadcast/...`

Two substeps: explainer, then composer.

Chapter title: EN **Your first broadcast**, FR **Votre première diffusion**.

### 9.1 `first-broadcast/intro`, skippable, no form

Footer override: `gotIt`. (Renamed `auditOfOne` → `audienceOfOne`. `whatItIsBody` rewritten.)

| Key | EN | FR |
|---|---|---|
| title | Broadcasts, in one minute | Les diffusions, en une minute |
| subtitle | A push notification you send manually to every installed card at once. | Une notification push que vous envoyez manuellement à toutes les cartes installées d'un coup. |
| whatItIsTitle | What it is | Qu'est-ce que c'est |
| whatItIsBody | One push notification, sent to every customer with your card installed. Useful for limited-time offers, events, new menu items, or anything you'd post on your socials. | Une notification push, envoyée à tous les clients qui ont votre carte installée. Utile pour les offres limitées, les événements, les nouveautés au menu, ou tout ce que vous publieriez sur vos réseaux. |
| differentFromTitle | Different from automatic messages | Différent des messages automatiques |
| differentFromBody | Stamp-added and reward-earned messages fire by themselves when something happens. Broadcasts are the opposite: you decide when, you decide what. | Les messages tampon ajouté ou récompense gagnée partent tout seuls quand quelque chose se passe. Les diffusions, c'est l'inverse : vous choisissez le moment, vous choisissez le contenu. |
| audienceOfOneTitle | Right now your audience is one person | Pour l'instant votre audience, c'est une personne |
| audienceOfOneBody | The only installed card so far is yours. So the broadcast you write next lands on your own phone. That's exactly the experience your real customers will get when you have an actual audience. | La seule carte installée pour l'instant, c'est la vôtre. Donc la diffusion que vous allez écrire arrive sur votre propre téléphone. C'est exactement ce que vos vrais clients vivront quand vous aurez une vraie audience. |

### 9.2 `first-broadcast/compose`, skippable, form

`sendFailed` no longer mentions plan (owner is on Pro trial during onboarding).

| Key | EN | FR |
|---|---|---|
| title | Write a broadcast and send it to yourself | Rédigez une diffusion et envoyez-la-vous |
| subtitle | One short message. It lands on your phone the moment you tap send. | Un message court. Il arrive sur votre téléphone dès que vous tapez sur envoyer. |
| composeBody | Write something you'd actually send to customers. Treat your own phone as the test seat: the wording, the timing, the buzz, everything will be exactly the same when you send to a real audience later. | Rédigez quelque chose que vous enverriez vraiment à des clients. Considérez votre téléphone comme le siège de test : le ton, le timing, la vibration, tout sera identique quand vous enverrez à une vraie audience plus tard. |
| titleLabel | Title | Titre |
| titlePlaceholder | e.g. Café du Coin | ex. Café du Coin |
| titleHint | Defaults to your business name. Appears in bold on the lock-screen banner. | Reprend votre nom de commerce par défaut. Apparaît en gras sur l'écran verrouillé. |
| bodyLabel | Message | Message |
| bodyPlaceholder | Happy hour today, 5pm to 7pm. Show your card for 20% off. | Happy hour aujourd'hui, 17h à 19h. Montrez votre carte pour -20%. |
| bodyHint | {remaining} characters left | {remaining} caractères restants |
| estimating | Counting recipients… | Comptage des destinataires… |
| recipientsLine `=0` | No installed cards yet. Try the previous step first. | Aucune carte installée. Revenez à l'étape précédente. |
| recipientsLine `=1` | This lands on your own phone. | Ce message arrive sur votre propre téléphone. |
| recipientsLine `other` | {count} installed customers will receive this. | {count} clients recevront ce message. |
| sendCta `=1` | Send it to my phone | L'envoyer sur mon téléphone |
| sendCta `other` | Send to {count} customers | Envoyer à {count} clients |
| sendingLabel | Sending… | Envoi en cours… |
| sentLabel | Broadcast sent | Diffusion envoyée |
| noRecipientsLabel | Nobody to send to yet | Personne à qui envoyer pour l'instant |
| sendingProgress | Dispatching the push. Usually 10 to 20 seconds. | On envoie le push. Généralement 10 à 20 secondes. |
| sendFailed | The broadcast couldn't be sent. Try again in a moment. | La diffusion n'a pas pu être envoyée. Réessayez dans un instant. |
| deliveredTitle `=0` | No pushes delivered yet | Aucun push livré pour l'instant |
| deliveredTitle `=1` | Pushed to your phone | Envoyé sur votre téléphone |
| deliveredTitle `other` | Pushed to {count} devices | Envoyé à {count} appareils |
| deliveredHint `=1` | Same exact experience your customers will get when you broadcast to a real audience. | Exactement la même expérience que vos clients quand vous diffuserez à une vraie audience. |
| deliveredHint `other` | {delivered} of {total} customers got the push. {skipped, plural, =0 {} =1 {1 customer skipped, card not installed.} other {# customers skipped, card not installed.}} | {delivered} clients sur {total} ont reçu le push. {skipped, plural, =0 {} =1 {1 client ignoré, carte non installée.} other {# clients ignorés, carte non installée.}} |

---

## Chapter 10, Team `/team`, skippable

Adds an explicit roles explanation. The dashboard `InviteDialog` is still the form below, unchanged.

| Key | EN | FR |
|---|---|---|
| title | Bring your team in | Ajoutez votre équipe |
| subtitle | Two kinds of access, depending on what they need to do. | Deux types d'accès, selon ce qu'ils ont à faire. |
| rolesTitle | Pick the right role | Choisissez le bon rôle |
| adminRole.label | Admin | Admin |
| adminRole.description | Full dashboard access, same as you. Can change the program, send broadcasts, manage the team. Good for co-founders and managers. | Accès complet au dashboard, comme vous. Peut modifier le programme, envoyer des diffusions, gérer l'équipe. Idéal pour les cofondateurs et managers. |
| scannerRole.label | Scanner | Scanner |
| scannerRole.description | Only the stamping screen on their phone. No dashboard, no settings, no customer data. Good for staff working the counter. | Uniquement l'écran de tamponnage sur leur téléphone. Pas de dashboard, pas de paramètres, pas de données clients. Idéal pour les équipes à la caisse. |
| inviteLabel | Send an invite | Envoyer une invitation |
| inviteHint | They get an email with the right access. You can revoke at any time. | Ils reçoivent un email avec le bon accès. Vous pouvez révoquer à tout moment. |
| inviteCta | Invite | Inviter |

---

## Chapter 11, Recap `/recap`, skippable

Unchanged from v2.

| Key | EN | FR |
|---|---|---|
| title | Look at what you've built | Regardez ce que vous avez construit |
| subtitle | A real loyalty program, on real phones, sending real notifications. Quick recap before we talk plans. | Un vrai programme de fidélité, sur de vrais téléphones, qui envoie de vraies notifications. Petit récap avant de parler offre. |
| cardLabel | Your card | Votre carte |
| programLabel | Your program | Votre programme |
| programDetail | {totalStamps} stamps for "{rewardName}" | {totalStamps} tampons pour « {rewardName} » |
| stampsLabel `=0` | No stamps sent yet | Aucun tampon envoyé |
| stampsLabel `=1` | 1 stamp sent to your phone | 1 tampon envoyé sur votre téléphone |
| stampsLabel `other` | {count} stamps sent to your phone | {count} tampons envoyés sur votre téléphone |
| broadcastLabel.sent | Broadcast received on your phone | Diffusion reçue sur votre téléphone |
| broadcastLabel.notSent | No broadcast sent yet | Aucune diffusion envoyée |
| teamLabel `=0` | Team: just you for now | Équipe : juste vous pour l'instant |
| teamLabel `=1` | Team: you and 1 invitation pending | Équipe : vous et 1 invitation en attente |
| teamLabel `other` | Team: you and {count} invitations pending | Équipe : vous et {count} invitations en attente |
| tweakCta | Want to tweak something? | Envie d'ajuster quelque chose ? |
| tweakLink.design | Edit the design | Modifier le design |
| tweakLink.program | Adjust the program | Ajuster le programme |
| tweakLink.team | Manage the team | Gérer l'équipe |
| nextLabel | Last step: pick a plan | Dernière étape : choisissez votre offre |

---

## Chapter 12, Plan `/plan`, skippable

| Key | EN | FR |
|---|---|---|
| title | Choose your plan | Choisissez votre offre |
| subtitle | You're on a 30-day Pro trial. Pick a plan now, or keep exploring on the trial. | Vous êtes en essai Pro de 30 jours. Choisissez maintenant, ou continuez sur l'essai. |
| keepTrialCta (footer override) | Decide later | Plus tard |
| recommendedBadge | Recommended | Recommandé |
| perMonth | /mo | /mois |
| youdLose | You'd lose: | Vous perdriez : |
| andMore | + {count} more… | + {count} autre(s)… |
| downgradeTitle | Switch to Starter? | Passer à Starter ? |
| downgradeBody | Some of what you've set up isn't available on Starter: | Certaines fonctionnalités configurées ne sont pas disponibles sur Starter : |
| downgradeNoLosses | Nothing you've configured will change. | Aucune de vos configurations ne sera affectée. |
| downgradeCancel | Cancel | Annuler |
| downgradeConfirm | Switch to Starter | Passer à Starter |

### Tier cards

Unchanged from v2 (Growth still interpolates `{growth_broadcasts_limit}`).

---

## At-a-glance index, v3

| # | Chapter | Sub-step | Required? | Writes to |
|---|---|---|---|---|
| 1 | welcome | welcome | skip | nothing |
| 2.1 | business | identity | **REQUIRED** | `businesses` row (tier=pro, trial) + `settings.identity_website` |
| 2.2 | business | profile | skip | `settings.{business_type, business_type_other, team_size, locations_count, primary_goal}` |
| 3 | program | program | **REQUIRED** | `loyalty_programs.{name, config.total_stamps, reward_name, config.user_configured}` |
| 4 | data-collection | data-collection | skip | `settings.customer_data_collection` |
| 5.1 | card-back | intro | skip | nothing |
| 5.2 | card-back | info | skip | `settings.business_info[]` |
| 6.1 | design | branding | **REQUIRED** | new `card_designs` row + `settings.design_reviewed=true` + `setup_progress.payload.design_id` |
| 6.2 | design | stamps | skip | same `card_designs` row |
| 6.3 | design | content | skip | same row |
| 6.4 | design | back | skip | same row + activates design |
| 7 | notifications | icon | skip | `businesses.icon_url` |
| 8.1 | first-stamp | install | skip | new `customers` + `enrollments` rows + `setup_progress.payload.{demo_customer_id, demo_enrollment_id}` |
| 8.2 | first-stamp | stamp | skip | `transactions` (per stamp) + APNs push |
| 9.1 | first-broadcast | intro | skip | nothing |
| 9.2 | first-broadcast | compose | skip | new `promotional_messages` row + `settings.first_broadcast_sent=true` |
| 10 | team | team | skip | `invitations` rows (via dialog) |
| 11 | recap | recap | skip | nothing |
| 12 | plan | plan | skip | `businesses.subscription_tier` OR Stripe checkout OR nothing |

**Required floor still 3:** Identity, Program, Design Branding.

---

## Summary of changes from v2

1. **Footer.** `next` is now "Continue" / "Continuer" (was "Save & continue"). `finish` is now "Launch my program" / "Lancer mon programme" (was "Finish setup").
2. **Welcome body** adds the "required gets you live, the rest makes it polished" framing so owners understand why they should keep going.
3. **Identity logo helper** swapped the "Square works best" recommendation for the actual aspect ratio constraint (3:1 wide).
4. **Card-back intro body** now names the Apple "three dots" gesture, includes terms and conditions in the list, and frames "designs" as variants of the same card.
5. **Card-back info subtitle** adds terms and conditions to the field list.
6. **Notification icon subtitle** explains the automatic-notification concept so it lands before the stamp push fires in 8.2. Transactional and milestone editing stay deferred to the dashboard.
7. **Combined Chapters 8 and 9 into Chapter 8, "Take it for a spin".** Substeps are `first-stamp/install` and `first-stamp/stamp`. Narratively continuous.
8. **New `customisationHint` in 8.2,** rendered once after the first successful stamp. No plan mention.
9. **First-broadcast intro** renamed key `auditOfOne` → `audienceOfOne` (was a typo). `whatItIsBody` rewritten to cut the redundant "tap send / sent" phrasing.
10. **First-broadcast `sendFailed`** drops the plan reference. Owner is on Pro trial, no limits to hit.
11. **Team chapter** adds an explicit roles explanation (Admin vs Scanner cards) before the invite form.
12. **Chapter numbering shifted.** 12 chapters total now (was 13 in v2).

No backend schema changes. Routing changes vs v2: rename `/live-stamp` → `/first-stamp/stamp`, rename `/first-customer` → `/first-stamp/install`. Add `customisationHint` key to the stamp step. Add `rolesTitle` + `adminRole` + `scannerRole` keys to the team step.