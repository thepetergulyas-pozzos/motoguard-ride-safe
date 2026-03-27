import { getUncachableRevenueCatClient } from "./revenueCatClient";
import {
  listProjects,
  createProject,
  listApps,
  createApp,
  listProducts,
  createProduct,
  listEntitlements,
  createEntitlement,
  attachProductsToEntitlement,
  listOfferings,
  createOffering,
  updateOffering,
  listPackages,
  createPackages,
  attachProductsToPackage,
  listAppPublicApiKeys,
  type App,
  type Product,
  type Entitlement,
  type Offering,
  type Package,
  type CreateProductData,
} from "@replit/revenuecat-sdk";

const PROJECT_NAME = "MotoGuard";
const APP_STORE_BUNDLE_ID = "com.motoguard.app";
const PLAY_STORE_PACKAGE_NAME = "com.motoguard.app";

const PLANS = [
  {
    identifier: "com.motoguard.basic.monthly",
    playStoreIdentifier: "com.motoguard.basic.monthly:monthly",
    displayName: "Basic Monthly",
    title: "MotoGuard Basic",
    duration: "P1M" as const,
    entitlementKey: "basic",
    entitlementName: "Basic Access",
    offeringKey: "basic",
    offeringName: "Basic Offering",
    packageKey: "$rc_monthly",
    packageName: "Basic Monthly",
    prices: [
      { amount_micros: 2990000, currency: "USD" },
      { amount_micros: 2790000, currency: "EUR" },
    ],
  },
  {
    identifier: "com.motoguard.pro.monthly",
    playStoreIdentifier: "com.motoguard.pro.monthly:monthly",
    displayName: "Pro Monthly",
    title: "MotoGuard Pro",
    duration: "P1M" as const,
    entitlementKey: "pro",
    entitlementName: "Pro Access",
    offeringKey: "pro",
    offeringName: "Pro Offering",
    packageKey: "$rc_monthly",
    packageName: "Pro Monthly",
    prices: [
      { amount_micros: 5990000, currency: "USD" },
      { amount_micros: 5490000, currency: "EUR" },
    ],
  },
  {
    identifier: "com.motoguard.prodrone.monthly",
    playStoreIdentifier: "com.motoguard.prodrone.monthly:monthly",
    displayName: "Pro+Drone Monthly",
    title: "MotoGuard Pro+Drone",
    duration: "P1M" as const,
    entitlementKey: "pro_drone",
    entitlementName: "Pro+Drone Access",
    offeringKey: "pro_drone",
    offeringName: "Pro+Drone Offering",
    packageKey: "$rc_monthly",
    packageName: "Pro+Drone Monthly",
    prices: [
      { amount_micros: 12990000, currency: "USD" },
      { amount_micros: 11990000, currency: "EUR" },
    ],
  },
];

type TestStorePricesResponse = {
  object: string;
  prices: { amount_micros: number; currency: string }[];
};

async function seedRevenueCat() {
  const client = await getUncachableRevenueCatClient();

  // === Project ===
  const { data: existingProjects } = await listProjects({ client, query: { limit: 20 } });
  let project = existingProjects?.items?.find((p) => p.name === PROJECT_NAME);
  if (!project) {
    const { data } = await createProject({ client, body: { name: PROJECT_NAME } });
    project = data!;
    console.log("Created project:", project.id);
  } else {
    console.log("Project exists:", project.id);
  }

  // === Apps ===
  const { data: appsData } = await listApps({ client, path: { project_id: project.id }, query: { limit: 20 } });
  const apps = appsData?.items ?? [];

  let testApp = apps.find((a) => a.type === "test_store");
  let appStoreApp = apps.find((a) => a.type === "app_store");
  let playStoreApp = apps.find((a) => a.type === "play_store");

  if (!testApp) throw new Error("No test store app found");
  console.log("Test Store app:", testApp.id);

  if (!appStoreApp) {
    const { data } = await createApp({ client, path: { project_id: project.id }, body: { name: "MotoGuard iOS", type: "app_store", app_store: { bundle_id: APP_STORE_BUNDLE_ID } } });
    appStoreApp = data!;
    console.log("Created App Store app:", appStoreApp.id);
  } else { console.log("App Store app:", appStoreApp.id); }

  if (!playStoreApp) {
    const { data } = await createApp({ client, path: { project_id: project.id }, body: { name: "MotoGuard Android", type: "play_store", play_store: { package_name: PLAY_STORE_PACKAGE_NAME } } });
    playStoreApp = data!;
    console.log("Created Play Store app:", playStoreApp.id);
  } else { console.log("Play Store app:", playStoreApp.id); }

  const { data: allProductsData } = await listProducts({ client, path: { project_id: project.id }, query: { limit: 100 } });
  const allProducts = allProductsData?.items ?? [];

  const ensureProduct = async (app: App, label: string, storeId: string, isTest: boolean, plan: typeof PLANS[0]): Promise<Product> => {
    const existing = allProducts.find((p) => p.store_identifier === storeId && p.app_id === app.id);
    if (existing) { console.log(`${label} product exists:`, existing.id); return existing; }
    const body: CreateProductData["body"] = { store_identifier: storeId, app_id: app.id, type: "subscription", display_name: plan.displayName };
    if (isTest) { body.subscription = { duration: plan.duration }; body.title = plan.title; }
    const { data } = await createProduct({ client, path: { project_id: project!.id }, body });
    console.log(`Created ${label} product:`, data!.id);
    return data!;
  };

  for (const plan of PLANS) {
    console.log(`\n--- Setting up ${plan.displayName} ---`);

    const testProduct = await ensureProduct(testApp!, "TestStore", plan.identifier, true, plan);
    const iosProduct = await ensureProduct(appStoreApp!, "AppStore", plan.identifier, false, plan);
    const androidProduct = await ensureProduct(playStoreApp!, "PlayStore", plan.playStoreIdentifier, false, plan);

    const { error: priceError } = await client.post<TestStorePricesResponse>({ url: "/projects/{project_id}/products/{product_id}/test_store_prices", path: { project_id: project.id, product_id: testProduct.id }, body: { prices: plan.prices } });
    if (priceError) console.log("Prices already set or error:", priceError);
    else console.log("Set test store prices for", plan.identifier);

    const { data: entitlementsData } = await listEntitlements({ client, path: { project_id: project.id }, query: { limit: 20 } });
    let entitlement: Entitlement | undefined = entitlementsData?.items?.find((e) => e.lookup_key === plan.entitlementKey);
    if (!entitlement) {
      const { data } = await createEntitlement({ client, path: { project_id: project.id }, body: { lookup_key: plan.entitlementKey, display_name: plan.entitlementName } });
      entitlement = data!;
      console.log("Created entitlement:", entitlement.id);
    } else { console.log("Entitlement exists:", entitlement.id); }

    const { error: attachErr } = await attachProductsToEntitlement({ client, path: { project_id: project.id, entitlement_id: entitlement.id }, body: { product_ids: [testProduct.id, iosProduct.id, androidProduct.id] } });
    if (attachErr) console.log("Attach entitlement note:", attachErr.type);
    else console.log("Attached products to entitlement");

    const { data: offeringsData } = await listOfferings({ client, path: { project_id: project.id }, query: { limit: 20 } });
    let offering: Offering | undefined = offeringsData?.items?.find((o) => o.lookup_key === plan.offeringKey);
    if (!offering) {
      const { data } = await createOffering({ client, path: { project_id: project.id }, body: { lookup_key: plan.offeringKey, display_name: plan.offeringName } });
      offering = data!;
      console.log("Created offering:", offering.id);
    } else { console.log("Offering exists:", offering.id); }

    if (plan.offeringKey === "basic" && !offering.is_current) {
      await updateOffering({ client, path: { project_id: project.id, offering_id: offering.id }, body: { is_current: true } });
      console.log("Set basic offering as current");
    }

    const { data: packagesData } = await listPackages({ client, path: { project_id: project.id, offering_id: offering.id }, query: { limit: 20 } });
    let pkg: Package | undefined = packagesData?.items?.find((p) => p.lookup_key === plan.packageKey);
    if (!pkg) {
      const { data } = await createPackages({ client, path: { project_id: project.id, offering_id: offering.id }, body: { lookup_key: plan.packageKey, display_name: plan.packageName } });
      pkg = data!;
      console.log("Created package:", pkg.id);
    } else { console.log("Package exists:", pkg.id); }

    const { error: attachPkgErr } = await attachProductsToPackage({ client, path: { project_id: project.id, package_id: pkg.id }, body: { products: [{ product_id: testProduct.id, eligibility_criteria: "all" }, { product_id: iosProduct.id, eligibility_criteria: "all" }, { product_id: androidProduct.id, eligibility_criteria: "all" }] } });
    if (attachPkgErr) console.log("Package attach note:", attachPkgErr.type ?? attachPkgErr);
    else console.log("Attached products to package");
  }

  // === API Keys ===
  console.log("\n=== API KEYS ===");
  const { data: testKeys } = await listAppPublicApiKeys({ client, path: { project_id: project.id, app_id: testApp!.id } });
  const { data: iosKeys } = await listAppPublicApiKeys({ client, path: { project_id: project.id, app_id: appStoreApp!.id } });
  const { data: androidKeys } = await listAppPublicApiKeys({ client, path: { project_id: project.id, app_id: playStoreApp!.id } });

  console.log("Test Store API Key:", testKeys?.items?.[0]?.key ?? "N/A");
  console.log("iOS API Key:", iosKeys?.items?.[0]?.key ?? "N/A");
  console.log("Android API Key:", androidKeys?.items?.[0]?.key ?? "N/A");
  console.log("Project ID:", project.id);
  console.log("\n→ Set these environment variables:");
  console.log("  EXPO_PUBLIC_REVENUECAT_TEST_API_KEY =", testKeys?.items?.[0]?.key ?? "TEST_KEY");
  console.log("  EXPO_PUBLIC_REVENUECAT_IOS_API_KEY =", iosKeys?.items?.[0]?.key ?? "IOS_KEY");
  console.log("  EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY =", androidKeys?.items?.[0]?.key ?? "ANDROID_KEY");
}

seedRevenueCat().catch(console.error);
