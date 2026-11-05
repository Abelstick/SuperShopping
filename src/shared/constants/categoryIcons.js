import {
  CategoryRounded, EggRounded, BakeryDiningRounded, LocalDrinkRounded, KitchenRounded,
  RestaurantRounded, SetMealRounded, GrassRounded, SoapRounded, CleaningServicesRounded,
  FaceRounded, ChildCareRounded, PetsRounded, IcecreamRounded, LocalBarRounded,
  HomeRepairServiceRounded, MedicationRounded, CakeRounded,
} from '@mui/icons-material'

// Iconos disponibles para una categoría. La clave es lo que se guarda en categories.icon.
export const CATEGORY_ICONS = {
  Category: { Icon: CategoryRounded, label: 'General' },
  Dairy: { Icon: EggRounded, label: 'Lácteos y huevos' },
  Bakery: { Icon: BakeryDiningRounded, label: 'Panadería' },
  Pantry: { Icon: KitchenRounded, label: 'Despensa' },
  Meals: { Icon: RestaurantRounded, label: 'Comidas' },
  Protein: { Icon: SetMealRounded, label: 'Carnes y pescados' },
  Produce: { Icon: GrassRounded, label: 'Frutas y verduras' },
  Drinks: { Icon: LocalDrinkRounded, label: 'Bebidas' },
  Alcohol: { Icon: LocalBarRounded, label: 'Licores' },
  Sweets: { Icon: IcecreamRounded, label: 'Dulces y helados' },
  Celebration: { Icon: CakeRounded, label: 'Celebraciones' },
  Cleaning: { Icon: CleaningServicesRounded, label: 'Limpieza' },
  Hygiene: { Icon: SoapRounded, label: 'Aseo' },
  Personal: { Icon: FaceRounded, label: 'Cuidado personal' },
  Baby: { Icon: ChildCareRounded, label: 'Bebé' },
  Pets: { Icon: PetsRounded, label: 'Mascotas' },
  Health: { Icon: MedicationRounded, label: 'Salud' },
  Home: { Icon: HomeRepairServiceRounded, label: 'Hogar' },
}

export const categoryIconOf = (key) => (CATEGORY_ICONS[key] ?? CATEGORY_ICONS.Category).Icon
