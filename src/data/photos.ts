import type { UniversityPhoto } from '../types';

/**
 * Фотографии кампусов с Wikimedia Commons: только свободные лицензии
 * (CC BY / CC BY-SA / CC0 / Public domain / FAL). Файлы скачаны в public/universities,
 * чтобы демо не зависело от внешнего хостинга.
 *
 * Условие лицензий CC BY и CC BY-SA — указание автора, лицензии и ссылки на источник.
 * Поэтому каждая карточка показывает подпись, а на странице «Источники» есть
 * полный список в формате APA. При замене фото обязательно переносите и credit.
 *
 * Сгенерировано скриптом поиска по Commons API, 2026-09-19.
 */
export const UNIVERSITY_PHOTOS: Record<string, UniversityPhoto> = {
  'nu': {
    src: 'universities/nu.jpg',
    author: "Dinononozavr1",
    year: '2018',
    title: "Nazarbayev University 2",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    page: "https://commons.wikimedia.org/wiki/File:Nazarbayev_University_2.jpg",
  },
  'kbtu': {
    src: 'universities/kbtu.jpg',
    author: "Matti Blume",
    year: '2024',
    title: "Kazakh-British Technical University, Almaty (P1180218)",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/deed.en",
    page: "https://commons.wikimedia.org/wiki/File:Kazakh-British_Technical_University,_Almaty_(P1180218).jpg",
  },
  'aitu': {
    src: 'universities/aitu.jpg',
    author: "ZhamilyaYeshen",
    year: '2020',
    title: "Коворкинг Astana IT University (1)",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    page: "https://commons.wikimedia.org/wiki/File:%D0%9A%D0%BE%D0%B2%D0%BE%D1%80%D0%BA%D0%B8%D0%BD%D0%B3_Astana_IT_University_(1).jpg",
  },
  'sdu': {
    src: 'universities/sdu.jpg',
    author: "Suleymen Demirel University",
    year: '2012',
    title: "Suleyman Demirel University - Outside view",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    page: "https://commons.wikimedia.org/wiki/File:Suleyman_Demirel_University_-_Outside_view.jpg",
  },
  'narxoz': {
    src: 'universities/narxoz.jpg',
    author: "Narxoz University",
    year: '2018',
    title: "Narxoz University 1",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    page: "https://commons.wikimedia.org/wiki/File:Narxoz_University_1.jpg",
  },
  'satbayev': {
    src: 'universities/satbayev.jpg',
    author: "LittleT889",
    year: '2026',
    title: "Satbayev University 2",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0",
    page: "https://commons.wikimedia.org/wiki/File:Satbayev_University_2.jpg",
  },
  'kaznu': {
    src: 'universities/kaznu.jpg',
    author: "Al-Farabi Kazakh National University (kaznu.kz)",
    year: '2023',
    title: "Al-Farabi KazNU rektorat",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    page: "https://commons.wikimedia.org/wiki/File:Al-Farabi_KazNU_rektorat.jpg",
  },
  'tartu': {
    src: 'universities/tartu.jpg',
    author: "A.Savin",
    year: '2022',
    title: "Tartu asv2022-04 img22 University main building",
    license: "FAL",
    licenseUrl: "http://artlibre.org/licence/lal/en",
    page: "https://commons.wikimedia.org/wiki/File:Tartu_asv2022-04_img22_University_main_building.jpg",
  },
  'polimi': {
    src: 'universities/polimi.jpg',
    author: "Luigi Brambilla",
    year: '2016',
    title: "Politecnico di MIlano",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    page: "https://commons.wikimedia.org/wiki/File:Politecnico_di_MIlano.jpg",
  },
  'tum': {
    src: 'universities/tum.jpg',
    author: "AuHaidhausen",
    year: '2023',
    title: "Technische Universität München",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0",
    page: "https://commons.wikimedia.org/wiki/File:Technische_Universit%C3%A4t_M%C3%BCnchen.jpg",
  },
  'elte': {
    src: 'universities/elte.jpg',
    author: "Globetrotter19",
    year: '2026',
    title: "ELTE Lágymányos Campus, 2026 Budapest",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    page: "https://commons.wikimedia.org/wiki/File:ELTE_L%C3%A1gym%C3%A1nyos_Campus,_2026_Budapest.jpg",
  },
  'debrecen': {
    src: 'universities/debrecen.jpg',
    author: "Автор не указан (Wikimedia Commons)",
    year: 'n.d.',
    title: "University of Debrecen - Main building",
    license: "CC BY-SA 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0",
    page: "https://commons.wikimedia.org/wiki/File:University_of_Debrecen_-_Main_building.jpg",
  },
  'bilkent': {
    src: 'universities/bilkent.jpg',
    author: "Bilkent University",
    year: '2020',
    title: "Bilkent University - Main Library",
    license: "CC BY 2.5",
    licenseUrl: "https://creativecommons.org/licenses/by/2.5",
    page: "https://commons.wikimedia.org/wiki/File:Bilkent_University_-_Main_Library.jpg",
  },
  'kaist': {
    src: 'universities/kaist.jpg',
    author: "Rickinasia",
    year: '2023',
    title: "IBS–KAIST Campus Building",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    page: "https://commons.wikimedia.org/wiki/File:IBS%E2%80%93KAIST_Campus_Building.jpg",
  },
  'ctu': {
    src: 'universities/ctu.jpg',
    author: "Czech Wikipedia user Utar",
    year: '2012',
    title: "CTU - New Building Dejvice, Prague, lecture halls 2",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    page: "https://commons.wikimedia.org/wiki/File:CTU_-_New_Building_Dejvice,_Prague,_lecture_halls_2.jpg",
  },
  'manchester': {
    src: 'universities/manchester.jpg',
    author: "Iris Chase",
    year: '2007',
    title: "Manchester University 3326027793",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0",
    page: "https://commons.wikimedia.org/wiki/File:Manchester_University_3326027793.jpg",
  },
  'asu': {
    src: 'universities/asu.jpg',
    author: "Titoxd",
    year: '2007',
    title: "ASU Old Main",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    page: "https://commons.wikimedia.org/wiki/File:ASU_Old_Main.jpg",
  },
};

/** APA 7: Author. (Year). Title [Photograph]. Wikimedia Commons. URL */
export function apaCitation(p: UniversityPhoto): string {
  return `${p.author}. (${p.year}). ${p.title} [Photograph]. Wikimedia Commons. ${p.page}`;
}

/** Ключ фото = префикс id программы: 'nu-cs' -> 'nu', 'kaist' -> 'kaist'. */
export function photoFor(programId: string): UniversityPhoto | null {
  return UNIVERSITY_PHOTOS[programId.split('-')[0]] ?? null;
}

/** Короткая подпись под фото: автор + лицензия (полная ссылка — на странице источников). */
export function shortCredit(p: UniversityPhoto): string {
  return `${p.author} / ${p.license} · Wikimedia Commons`;
}
