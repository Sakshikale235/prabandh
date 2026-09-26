export const event={name:'COLDPLAY · MUSIC OF THE SPHERES',date:'18 Jan 2026',time:'6:00 PM onwards',venue:'D.Y. Patil Stadium · Navi Mumbai',attendees:58420};

export const crowd={total:43812,utilization:74,gates:{A:68,B:91,C:54,D:72},forecast:[{label:'+15 min',level:'Moderate',detail:'Gate B 86%'},{label:'+30 min',level:'High',detail:'Gate B 94%'},{label:'+60 min',level:'High',detail:'North exit 89%'}]};

export const venueLocations=[
 {id:'gate-a',name:'Gate A',type:'Gate',zone:'North',position:'pin-a',status:'Active'},
 {id:'gate-b',name:'Gate B',type:'Gate',zone:'North-East',position:'pin-b',status:'Active'},
 {id:'gate-c',name:'Gate C',type:'Gate',zone:'South',position:'pin-c',status:'Active'},
 {id:'gate-d',name:'Gate D',type:'Gate',zone:'South-East',position:'pin-d',status:'Active'},
 {id:'food-court',name:'Food Court',type:'Food Stall',zone:'Zone B',status:'Active'},
 {id:'medical-01',name:'Medical 01',type:'Medical Point',zone:'Zone C',status:'Active'},
 {id:'stall-3',name:'Food Stall 3',type:'Food Stall',zone:'Zone B',wait:'7 min',status:'Active'},
];

export const volunteers=[
 {id:'v1',name:'Riya',role:'Gate Management',zone:'Gate A',shift:'16:00–22:00',status:'Green',phone:'+91 98200 11234'},
 {id:'v2',name:'Arjun',role:'Crowd Control',zone:'Gate B',shift:'16:00–22:00',status:'Amber',phone:'+91 98200 55678'},
 {id:'v3',name:'Meera',role:'Medical Support',zone:'Zone C',shift:'15:00–23:00',status:'Green',phone:'+91 98200 99012'},
 {id:'v4',name:'Kabir',role:'Parking Guidance',zone:'Parking',shift:'14:00–23:00',status:'Blue',phone:'+91 98200 34456'},
];

export const volunteerRoles=['Gate Management','Crowd Control','Medical Support','Information Desk','Food Zone','Transport / Shuttle','Parking Guidance','Emergency Response'];
export const locationTypes=['Gate','Exit','Food Stall','Restaurant','Medical Point','Restroom','Water Point','Volunteer Point','Parking','Shuttle Stop','Stage'];
export const stallStatuses=['OPEN','BUSY','TEMPORARILY CLOSED'];

export const restaurants=[
 {name:'The Food Court',wait:'8 min',capacity:'62%',type:'Food & Beverage',updatedAt:'2 min ago',stallStatus:'OPEN'},
 {name:'Spice Route',wait:'17 min',capacity:'82%',type:'Restaurant',updatedAt:'2 min ago',stallStatus:'OPEN'},
 {name:'Green Bowl',wait:'4 min',capacity:'38%',type:'Quick Service',updatedAt:'6 min ago',stallStatus:'OPEN'},
 {name:'Sky Lounge',wait:'25 min',capacity:'91%',type:'Premium Dining',updatedAt:'9 min ago',stallStatus:'BUSY'},
];

export const hotels=[
 {name:'Sunset Grand Hotel',rooms:2,rating:4.6},
 {name:'Navi Mumbai Suites',rooms:7,rating:4.3},
 {name:'Stadium View Inn',rooms:3,rating:4.1},
];

export const transport=[
 {name:'Metro Line 1',status:'Regular',eta:'7 min',type:'Metro'},
 {name:'Event Shuttle',status:'3 buses',eta:'4 min',type:'Shuttle'},
 {name:'NMMT Bus 24',status:'Moderate',eta:'11 min',type:'Bus'},
];

export const parking=[
 {name:'P1 — Main Parking',distance:'1.2 km',status:'Open'},
 {name:'P2 — East Parking',distance:'1.8 km',status:'Open'},
 {name:'P3 — Staff Parking',distance:'2.1 km',status:'Restricted'},
];

export const liveUpdates=[
 {id:'u1',tone:'amber',title:'High Crowd · Gate B',meta:'Occupancy at Gate B increased to 91%',time:'5 mins ago'},
 {id:'u2',tone:'blue',title:'Shuttle Bus',meta:'To D.Y. Patil Stadium at Gate C',time:'2 mins ago'},
 {id:'u3',tone:'green',title:'Food Stall 3',meta:'Shorter wait time now available',time:'18 mins ago'},
 {id:'u4',tone:'green',title:'Crowd Flow',meta:'Movement across zones is Normal',time:'25 mins ago'},
];

export const recommendations=[
 {id:'rec-1',title:'Redirect Gate B traffic',reason:'Move the next 800–1,000 attendees toward Gate C for 15 minutes.',impact:'High impact',type:'redirect',payload:{from:'B',to:'C',amount:15},status:'pending'},
 {id:'rec-2',title:'Add 2 food counters',reason:'Food Court wait time is projected to cross 18 min.',impact:'Medium impact',type:'food',status:'pending'},
 {id:'rec-3',title:'Open Shuttle Bay 2',reason:'After-event departure pressure is building near Gate B.',impact:'High impact',type:'shuttle',status:'pending'},
 {id:'rec-4',title:'Move volunteers to Gate B',reason:'Shift coverage from low-pressure Parking to Gate B.',impact:'Medium impact',type:'volunteer',payload:{fromZone:'Parking',toZone:'Gate B',count:1},status:'pending'},
];

export const requests=[
 {id:'R-1042',from:'Organizer',text:'Need 2 extra hotel rooms for artist support',priority:'High',type:'hotel-rooms',amount:2,status:'pending'},
 {id:'R-1043',from:'Organizer',text:'Confirm food counter capacity for Gate C',priority:'Medium',type:'info',status:'pending'},
 {id:'R-1044',from:'Organizer',text:'Share updated restaurant wait estimate',priority:'Medium',type:'info',status:'pending'},
 {id:'R-1045',from:'Attendee support',text:'Check 2-room availability',priority:'Low',type:'info',status:'pending'},
];
