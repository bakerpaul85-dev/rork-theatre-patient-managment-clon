export interface Radiographer {
  name: string;
  prefix: string;
  status: 'Active' | 'New' | 'Inactive';
  email: string;
}

export const RADIOGRAPHERS: Radiographer[] = [
  { name: 'Abaqulusi Hospital', prefix: 'RADDEXA', status: 'Active', email: 'reception.vryheid@raddex.co.za' },
  { name: 'Anelisa Moyo', prefix: 'MOY', status: 'Active', email: 'moyoanelisa@gmail.com' },
  { name: 'Ashley Mbokota', prefix: 'MBO', status: 'Active', email: 'mbokotaashley@gmail.com' },
  { name: 'Ashton Govender', prefix: 'GOV', status: 'New', email: 'ashtongovender991027@gmail.com' },
  { name: 'Carina Van Der Merwe', prefix: 'CAR', status: 'Active', email: 'info3@medadmin.co.za' },
  { name: 'Caunter Penny', prefix: 'CAU', status: 'Active', email: '' },
  { name: 'Confrey Molomo', prefix: 'CON', status: 'Active', email: 'confreymolomo@gmail.com' },
  { name: 'Dr CW Gilfillan', prefix: 'GIL', status: 'Active', email: 'xray@gilfil.co.za' },
  { name: 'DR Gizelle Badenhorst', prefix: 'BX', status: 'Active', email: 'badenhorstxstrale@gmail.com' },
  { name: 'Emmanuel Mimed', prefix: 'MIMED', status: 'Active', email: 'xray@mimed.co.za' },
  { name: 'Emoyamed Jeffrey', prefix: 'JEFF', status: 'Active', email: 'kasheefa@centaurimedical.co.za' },
  { name: 'Goddard Ashlie Pretorious', prefix: 'ASH', status: 'Active', email: 'cardiopay@gmail.com' },
  { name: 'Goiwakae Terrence', prefix: 'GOI', status: 'Active', email: 'terrenceg83@gmail.com' },
  { name: 'Innocent Maemu', prefix: 'MAEMU', status: 'New', email: '' },
  { name: 'Kaloo Bilal', prefix: 'BIL', status: 'Active', email: 'bkaloorad@gmail.com' },
  { name: 'Khan Nasreen', prefix: 'NASK', status: 'Active', email: 'mobilemedicalsolutions@gmail.com' },
  { name: 'Kgaugelo Moropane (WinnySolutions)', prefix: 'WS', status: 'Active', email: 'kgmoropane@winnysolutions.co.za' },
  { name: 'Khodani Mavhusha', prefix: 'KHO', status: 'Active', email: 'cody.mavhusha@gmail.com' },
  { name: 'Krista Joubert', prefix: 'JOUB', status: 'Active', email: 'info3@medadmin.co.za' },
  { name: 'Kudzi Mpho', prefix: 'KUD', status: 'Active', email: '' },
  { name: 'Kwinana Thulani', prefix: 'THU', status: 'Active', email: 'thulanikwinana@gmail.com' },
  { name: 'Leon Radiographers', prefix: 'LEO', status: 'Active', email: 'leon.radxrays@gmail.com' },
  { name: 'Leslie Daniso', prefix: 'DAN', status: 'Active', email: 'danisol@vodamail.co.za' },
  { name: 'Marlise Coetzee', prefix: 'MAR', status: 'Active', email: 'info3@medadmin.co.za' },
  { name: 'Melusi Hlophe', prefix: 'HLO', status: 'New', email: 'rainbowotr1@gmail.com' },
  { name: 'Mokhera Kwetsa', prefix: 'KWE', status: 'Active', email: 'kwetsamokhera@gmail.com' },
  { name: 'Morkel Desiree', prefix: 'DES', status: 'Active', email: 'info3@medadmin.co.za' },
  { name: 'Morck Lindsay', prefix: 'LIN', status: 'Active', email: 'lindsay@xraymorck.co.za' },
  { name: 'Naimah Patel', prefix: 'NP', status: 'Active', email: 'naimahp@hotmail.com' },
  { name: 'Nureki Rams', prefix: 'RAM', status: 'Active', email: 'nrhamis@gmail.com' },
  { name: 'Palesa Khateane', prefix: 'PAL', status: 'Active', email: 'palesakhateane@gmail.com' },
  { name: 'Patson Machila', prefix: 'PAT', status: 'Active', email: 'machona.machila@gmail.com' },
  { name: 'Ramnath Natasha', prefix: 'NAT', status: 'Active', email: 'keeranr@mweb.co.za' },
  { name: 'Ravele Thifhelimbilu Brenda', prefix: 'BRE', status: 'Active', email: 'thifhelimbilu.ravele@gmail.com' },
  { name: 'RH Piet Retief Private Hospital', prefix: 'RADDEX', status: 'Active', email: 'reception.prph@raddex.co.za' },
  { name: 'Roentes', prefix: 'ROE', status: 'Active', email: 'roentes@mweb.co.za' },
  { name: 'Roux S', prefix: 'ROUX/SHANI', status: 'Active', email: 'garsha.roux@gmail.com' },
  { name: 'Sarice Robberts', prefix: 'ROB', status: 'Active', email: 'info@acceptabill.co.za' },
  { name: 'Sipho Nxumalo', prefix: 'SIPH', status: 'Active', email: 'janayg@inyosiots.co.za' },
  { name: 'Southdale Medical Centre', prefix: 'SOU', status: 'Active', email: 'radiologysouthdalemedicalc@gmail.com' },
  { name: 'Sunshine Hospital', prefix: 'SUN', status: 'Inactive', email: '' },
  { name: 'Thabang Moshoati', prefix: 'TMG', status: 'Active', email: 'tgmoshoati@gmail.com' },
  { name: 'Thomas Makete (Sikilikiti X-ray imaging)', prefix: 'MAK', status: 'Active', email: 'sikixrays@gmail.com' },
  { name: 'Tshililo Chere', prefix: 'CHE', status: 'Active', email: 'tshililochere@gmail.com' },
  { name: 'Van Jaarsveldt Carol', prefix: 'CVJ', status: 'Active', email: 'wcaadmin@vjrad.co.za' },
  { name: 'Viljoen Roelien', prefix: 'MOXS', status: 'Active', email: 'heidelberg@moxs.co.za' },
  { name: 'Vuyani Atoni', prefix: 'ATONI', status: 'Active', email: 'atoni8861@gmail.com' },
  { name: 'Wilken Johan', prefix: 'WILJ', status: 'Active', email: 'accounts@theatrexray.co.za' },
  { name: 'William Ntlele', prefix: 'LIAM', status: 'Active', email: 'wntlele@gmail.com' },
  { name: 'Young Shelly Cadle', prefix: 'SHELL', status: 'Active', email: 'shellcadle@gmail.com' },
  { name: 'Kevin Hogg', prefix: 'HOG', status: 'Active', email: 'kevin@centaurimedical.co.za' },
  { name: 'Paul Baker', prefix: 'BAK', status: 'Active', email: 'paul@btstech.co.za' },
  { name: 'Allan Westoby', prefix: 'WES', status: 'Active', email: 'allan@medimarketing100.co.za' },
  { name: 'Zoutpansberg X-ray imaging', prefix: 'JEFF', status: 'Active', email: 'caitlin@centaurimedical.co.za' },
];

export function findRadiographerByEmail(email: string): Radiographer | undefined {
  const normalizedEmail = email.toLowerCase().trim();
  return RADIOGRAPHERS.find(r => r.email.toLowerCase() === normalizedEmail);
}
