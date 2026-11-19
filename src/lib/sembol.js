// yr.no sembol kodlarının Türkçe karşılıkları
export const SEMBOL = {
  clearsky: 'Açık', fair: 'Az bulutlu', partlycloudy: 'Parçalı bulutlu', cloudy: 'Bulutlu',
  fog: 'Sisli', lightrain: 'Hafif yağmurlu', rain: 'Yağmurlu', heavyrain: 'Kuvvetli yağmur',
  lightrainshowers: 'Hafif sağanak', rainshowers: 'Sağanak', heavyrainshowers: 'Kuvvetli sağanak',
  rainandthunder: 'Gök gürültülü yağmur', rainshowersandthunder: 'Gök gürültülü sağanak',
  heavyrainandthunder: 'Kuvvetli fırtına', lightsleet: 'Hafif karla karışık', sleet: 'Karla karışık',
  lightsnow: 'Hafif kar', snow: 'Kar', heavysnow: 'Yoğun kar', snowshowers: 'Kar sağanağı',
};

export function sembolMetni(kod = '') {
  const temel = String(kod).replace(/_(day|night|polartwilight)$/, '');
  return SEMBOL[temel] || 'Değişken';
}
