// Owned by the krillion track. Category lists for Krillion (rare answers score) and
// Nokrillion (common answers score). Each puzzle has a unique, opaque `key` and three rounds.
//
// Every list is ordered from the answer most people would say to the rarest, by estimate.
// Categories are closed (or nearly), so a right answer is almost never missing. Each answer
// is written "Display name|alias|alias"; the first name is what the ladder shows.

export type KrillionAnswer = { names: string[] };
export type Category = { prompt: string; answers: KrillionAnswer[] };
export type KrillionPuzzle = { key: string; rounds: Category[] };

/** `"Brazil; United States|usa|america"` → answers, in order. */
function category(prompt: string, list: string): Category {
  const answers = list
    .split(";")
    .map((entry) => ({ names: entry.split("|").map((n) => n.trim()).filter(Boolean) }))
    .filter((a) => a.names.length > 0);
  return { prompt, answers };
}

// ---------------------------------------------------------------- Krillion: a long tail

const SOUTH_AMERICA = category(
  "Name a country in South America",
  `Brazil|brasil; Argentina; Colombia; Peru; Chile; Venezuela; Ecuador; Bolivia; Uruguay;
   Paraguay; Guyana; Suriname`,
);

const US_STATES = category(
  "Name a US state",
  `California|cali; Texas; Florida; New York|ny; Hawaii; Alaska; Washington|washington state;
   Ohio; Colorado; Arizona; Nevada; Georgia; Michigan; Illinois; Oregon; Pennsylvania;
   New Jersey; Massachusetts; Virginia; North Carolina; Tennessee; Louisiana; Utah; Montana;
   Minnesota; Kentucky; Alabama; Wisconsin; Maine; Indiana; Missouri; South Carolina; Idaho;
   Kansas; Oklahoma; Iowa; Nebraska; Mississippi; Arkansas; Wyoming; Vermont; Connecticut;
   Maryland; New Mexico; New Hampshire; West Virginia; Rhode Island; North Dakota;
   South Dakota; Delaware`,
);

const PLANETS = category(
  "Name a planet in our solar system",
  `Mars; Earth; Jupiter; Saturn; Venus; Mercury; Neptune; Uranus`,
);

const EUROPE = category(
  "Name a country in Europe",
  `France; Germany; Italy; Spain;
   United Kingdom|uk|britain|great britain|england|scotland|wales|northern ireland;
   Portugal; Greece; Ireland|republic of ireland|eire; Netherlands|holland|the netherlands;
   Switzerland; Sweden; Norway; Russia; Poland; Belgium; Austria; Denmark; Finland; Ukraine;
   Iceland; Czech Republic|czechia; Hungary; Croatia; Romania; Turkey|turkiye; Serbia;
   Bulgaria; Slovakia; Slovenia; Luxembourg; Monaco; Albania; Estonia; Latvia; Lithuania;
   Belarus; Bosnia and Herzegovina|bosnia|bosnia herzegovina; Montenegro;
   North Macedonia|macedonia; Moldova; Malta; Cyprus; Andorra; San Marino; Liechtenstein;
   Vatican City|vatican|holy see; Kosovo`,
);

const ZODIAC = category(
  "Name a sign of the zodiac",
  `Leo; Scorpio; Gemini; Aries; Virgo; Taurus; Cancer; Libra; Sagittarius; Pisces; Aquarius;
   Capricorn`,
);

const ELEMENTS = category(
  "Name one of the first 20 elements on the periodic table",
  `Oxygen; Hydrogen; Carbon; Helium; Nitrogen; Sodium; Calcium; Neon; Lithium; Magnesium;
   Potassium; Chlorine; Sulfur|sulphur; Aluminum|aluminium; Silicon; Fluorine; Phosphorus;
   Boron; Argon; Beryllium`,
);

const GREEK_GODS = category(
  "Name a Greek god, goddess or Titan",
  `Zeus; Poseidon; Hades; Athena|athene; Aphrodite; Apollo; Hera; Ares; Hermes; Artemis;
   Dionysus|dionysos; Kronos|cronus|cronos; Hephaestus|hephaistos; Demeter; Persephone; Eros;
   Nike; Gaia|gaea; Atlas; Prometheus; Hestia; Pan; Hecate|hekate; Helios; Nyx; Rhea; Selene;
   Iris; Hypnos; Morpheus; Nemesis; Eos; Thanatos; Hebe; Tyche; Asclepius|asklepios;
   Uranus|ouranos; Oceanus; Hyperion; Themis; Mnemosyne; Eris; Boreas`,
);

const NATO = category(
  "Name a word from the NATO phonetic alphabet",
  `Alpha|alfa; Bravo; Charlie; Delta; Echo; Foxtrot; Tango; Zulu; Romeo; Whiskey|whisky;
   Victor; Oscar; Sierra; X-ray|xray; Yankee; Juliet|juliett; Hotel; Golf; India; Mike; Lima;
   Papa; Kilo; November; Quebec; Uniform`,
);

const CANADA = category(
  "Name a Canadian province or territory",
  `Ontario; Quebec; British Columbia|bc; Alberta; Nova Scotia; Manitoba; Saskatchewan;
   Newfoundland and Labrador|newfoundland|labrador; Yukon; New Brunswick;
   Prince Edward Island|pei; Northwest Territories|nwt; Nunavut`,
);

const AUSTRALIA = category(
  "Name an Australian state or territory",
  `New South Wales|nsw; Victoria; Queensland; Western Australia|wa; Tasmania;
   South Australia|sa; Northern Territory|nt; Australian Capital Territory|act`,
);

const ASIA = category(
  "Name a country in Asia",
  `China; Japan; India; South Korea|korea; Thailand; Vietnam; Philippines; Indonesia;
   North Korea; Singapore; Malaysia; Pakistan; Russia; Iran; Iraq; Israel; Saudi Arabia;
   Afghanistan; Nepal; Bangladesh; Sri Lanka; Mongolia; Turkey|turkiye; Cambodia; Taiwan;
   United Arab Emirates|uae|emirates; Myanmar|burma; Laos; Qatar; Kazakhstan; Syria; Jordan;
   Lebanon; Bhutan; Maldives; Kuwait; Uzbekistan; Oman; Yemen; Bahrain; Brunei; Georgia;
   Armenia; Azerbaijan; Palestine; Kyrgyzstan; Tajikistan; Turkmenistan;
   Timor-Leste|east timor`,
);

const PRESIDENTS = category(
  "Name a US president",
  `Abraham Lincoln|lincoln|abe lincoln; George Washington|washington; Barack Obama|obama;
   Donald Trump|trump; John F. Kennedy|kennedy|jfk|john kennedy; Joe Biden|biden;
   Ronald Reagan|reagan; Franklin D. Roosevelt|fdr|franklin roosevelt|roosevelt|franklin delano roosevelt;
   Thomas Jefferson|jefferson; Theodore Roosevelt|teddy roosevelt|teddy;
   Bill Clinton|clinton; George W. Bush|bush|george bush|dubya;
   Richard Nixon|nixon; Jimmy Carter|carter;
   George H. W. Bush|george hw bush|bush senior|bush sr|george bush senior;
   John Adams|adams; Dwight D. Eisenhower|eisenhower|ike|dwight eisenhower;
   Harry S. Truman|truman|harry truman; Andrew Jackson|jackson;
   Lyndon B. Johnson|lbj|lyndon johnson|johnson; James Madison|madison;
   Ulysses S. Grant|grant|ulysses grant; James Monroe|monroe; Gerald Ford|ford;
   John Quincy Adams|jqa; Woodrow Wilson|wilson; Herbert Hoover|hoover;
   William Howard Taft|taft; Calvin Coolidge|coolidge; Andrew Johnson;
   James K. Polk|polk|james polk; Martin Van Buren|van buren;
   William McKinley|mckinley; Grover Cleveland|cleveland; Warren G. Harding|harding;
   Zachary Taylor|taylor; Rutherford B. Hayes|hayes; James Buchanan|buchanan;
   Franklin Pierce|pierce; William Henry Harrison|harrison; Benjamin Harrison|ben harrison;
   John Tyler|tyler; Millard Fillmore|fillmore; James A. Garfield|garfield|james garfield;
   Chester A. Arthur|chester arthur|arthur`,
);

const GREEK_LETTERS = category(
  "Name a letter of the Greek alphabet",
  `Alpha; Beta; Omega; Delta; Pi; Gamma; Sigma; Theta; Lambda; Epsilon; Zeta; Kappa;
   Omicron; Mu; Phi; Psi; Rho; Chi; Tau; Eta; Iota; Xi; Nu; Upsilon`,
);

const SHAKESPEARE = category(
  "Name a play by Shakespeare",
  `Romeo and Juliet; Hamlet; Macbeth;
   A Midsummer Night's Dream|midsummer nights dream|midsummer; Othello; King Lear|lear;
   Julius Caesar; The Tempest; Much Ado About Nothing|much ado; Twelfth Night;
   The Merchant of Venice; The Taming of the Shrew; As You Like It;
   Richard III|richard the third|richard 3; Henry V|henry the fifth|henry 5;
   Antony and Cleopatra; The Comedy of Errors; The Merry Wives of Windsor|merry wives;
   The Winter's Tale|winters tale; Coriolanus; Titus Andronicus;
   Henry IV|henry the fourth|henry 4|henry iv part 1|henry iv part 2;
   Richard II|richard the second|richard 2; Measure for Measure;
   All's Well That Ends Well|alls well; Love's Labour's Lost|loves labours lost|loves labors lost;
   The Two Gentlemen of Verona|two gentlemen; Timon of Athens; Troilus and Cressida;
   Cymbeline; Pericles; King John; Henry VIII|henry the eighth|henry 8;
   Henry VI|henry the sixth|henry 6|henry vi part 1|henry vi part 2|henry vi part 3;
   The Two Noble Kinsmen`,
);

const MONOPOLY = category(
  "Name a property on the classic US Monopoly board",
  `Boardwalk; Park Place; Marvin Gardens; Reading Railroad|reading;
   Baltimore Avenue|baltimore; Mediterranean Avenue|mediterranean;
   Illinois Avenue|illinois; Atlantic Avenue|atlantic;
   Pennsylvania Avenue|pennsylvania; Electric Company; Water Works;
   B&O Railroad|b and o railroad|b and o|b&o; Short Line|short line railroad;
   St. Charles Place|st charles|saint charles place; Kentucky Avenue|kentucky;
   New York Avenue|new york; Ventnor Avenue|ventnor; Indiana Avenue|indiana;
   Pennsylvania Railroad; Tennessee Avenue|tennessee; Pacific Avenue|pacific;
   Vermont Avenue|vermont; Connecticut Avenue|connecticut; Oriental Avenue|oriental;
   North Carolina Avenue|north carolina; Virginia Avenue|virginia;
   St. James Place|st james|saint james place; States Avenue|states`,
);

const NFL = category(
  "Name an NFL team",
  `Dallas Cowboys|cowboys|dallas; New England Patriots|patriots|pats|new england;
   Green Bay Packers|packers|green bay; Kansas City Chiefs|chiefs|kansas city;
   Pittsburgh Steelers|steelers|pittsburgh; San Francisco 49ers|49ers|niners|san francisco;
   Philadelphia Eagles|eagles|philadelphia; New York Giants|giants; Chicago Bears|bears|chicago;
   Denver Broncos|broncos|denver; Seattle Seahawks|seahawks|seattle; Miami Dolphins|dolphins|miami;
   Las Vegas Raiders|raiders|oakland raiders; Buffalo Bills|bills|buffalo;
   Baltimore Ravens|ravens|baltimore; New York Jets|jets; Detroit Lions|lions|detroit;
   Minnesota Vikings|vikings|minnesota; Tampa Bay Buccaneers|buccaneers|bucs|tampa bay;
   New Orleans Saints|saints|new orleans; Los Angeles Rams|rams;
   Cleveland Browns|browns|cleveland; Cincinnati Bengals|bengals|cincinnati;
   Atlanta Falcons|falcons|atlanta; Carolina Panthers|panthers|carolina;
   Indianapolis Colts|colts|indianapolis; Washington Commanders|commanders|washington;
   Arizona Cardinals|cardinals|arizona; Los Angeles Chargers|chargers;
   Tennessee Titans|titans|tennessee; Houston Texans|texans|houston;
   Jacksonville Jaguars|jaguars|jags|jacksonville`,
);

const NBA = category(
  "Name an NBA team",
  `Los Angeles Lakers|lakers|la lakers; Chicago Bulls|bulls|chicago; Boston Celtics|celtics|boston;
   Golden State Warriors|warriors|golden state; Miami Heat|heat|miami;
   New York Knicks|knicks; San Antonio Spurs|spurs|san antonio;
   Cleveland Cavaliers|cavaliers|cavs|cleveland; Brooklyn Nets|nets|brooklyn;
   Houston Rockets|rockets|houston; Dallas Mavericks|mavericks|mavs|dallas;
   Philadelphia 76ers|76ers|sixers|philadelphia; Los Angeles Clippers|clippers|la clippers;
   Toronto Raptors|raptors|toronto; Phoenix Suns|suns|phoenix; Denver Nuggets|nuggets|denver;
   Milwaukee Bucks|bucks|milwaukee; Oklahoma City Thunder|thunder|okc|oklahoma city;
   Detroit Pistons|pistons|detroit; Orlando Magic|magic|orlando; Atlanta Hawks|hawks|atlanta;
   Utah Jazz|jazz|utah; Portland Trail Blazers|trail blazers|blazers|portland;
   Indiana Pacers|pacers|indiana; Minnesota Timberwolves|timberwolves|wolves|minnesota;
   Memphis Grizzlies|grizzlies|memphis; Sacramento Kings|kings|sacramento;
   Washington Wizards|wizards|washington; Charlotte Hornets|hornets|charlotte;
   New Orleans Pelicans|pelicans|new orleans`,
);

const MLB = category(
  "Name a Major League Baseball team",
  `New York Yankees|yankees; Boston Red Sox|red sox|boston; Los Angeles Dodgers|dodgers;
   Chicago Cubs|cubs; St. Louis Cardinals|cardinals|st louis|cards;
   San Francisco Giants|giants|san francisco; New York Mets|mets; Atlanta Braves|braves|atlanta;
   Houston Astros|astros|houston; Chicago White Sox|white sox;
   Philadelphia Phillies|phillies|philadelphia; Detroit Tigers|tigers|detroit;
   Seattle Mariners|mariners|seattle; Texas Rangers|rangers|texas;
   Toronto Blue Jays|blue jays|jays|toronto; Baltimore Orioles|orioles|baltimore;
   Cleveland Guardians|guardians|cleveland indians|cleveland; San Diego Padres|padres|san diego;
   Minnesota Twins|twins|minnesota; Athletics|oakland athletics|oakland a's|a's|oakland;
   Milwaukee Brewers|brewers|milwaukee; Cincinnati Reds|reds|cincinnati;
   Pittsburgh Pirates|pirates|pittsburgh; Arizona Diamondbacks|diamondbacks|d-backs|arizona;
   Colorado Rockies|rockies|colorado; Kansas City Royals|royals|kansas city;
   Los Angeles Angels|angels|anaheim angels; Tampa Bay Rays|rays|tampa bay|devil rays;
   Miami Marlins|marlins|miami|florida marlins; Washington Nationals|nationals|nats|washington`,
);

const EURO_CAPITALS = category(
  "Name a capital city in Europe",
  `Paris; London; Rome; Berlin; Madrid; Amsterdam; Athens; Lisbon; Dublin; Vienna; Moscow;
   Prague; Brussels; Stockholm; Oslo; Copenhagen; Warsaw; Budapest; Helsinki; Bern|berne;
   Kyiv|kiev; Reykjavik; Edinburgh; Bucharest; Belgrade; Sofia; Zagreb; Bratislava; Ljubljana;
   Tallinn; Riga; Vilnius; Minsk; Valletta; Luxembourg|luxembourg city; Monaco;
   Andorra la Vella; San Marino; Vaduz; Vatican City|vatican; Tirana; Sarajevo; Podgorica;
   Skopje; Chisinau; Nicosia; Pristina; Cardiff; Belfast`,
);

const STATE_CAPITALS = category(
  "Name a US state capital",
  `Austin; Sacramento; Boston; Atlanta; Denver; Phoenix; Nashville; Honolulu; Albany;
   Tallahassee; Salt Lake City; Juneau; Columbus; Indianapolis; Richmond; Raleigh; Olympia;
   Springfield; Baton Rouge; Carson City; Santa Fe; Lansing; Madison; Annapolis; Providence;
   Hartford; Oklahoma City; Little Rock; Saint Paul|st paul; Des Moines; Boise; Harrisburg;
   Trenton; Montgomery; Jackson; Columbia; Charleston; Frankfort; Lincoln; Topeka; Cheyenne;
   Helena; Bismarck; Pierre; Salem; Dover; Concord; Montpelier; Augusta; Jefferson City`,
);

const SUMMER_SPORTS = category(
  "Name a Summer Olympic sport",
  `Swimming; Gymnastics; Track and Field|athletics|track|running|sprinting;
   Basketball; Soccer|football; Volleyball|beach volleyball; Tennis; Diving; Boxing;
   Cycling|bmx|mountain biking; Wrestling; Rowing; Fencing; Weightlifting; Archery;
   Equestrian|horse riding|dressage|show jumping; Skateboarding; Surfing; Golf; Sailing; Judo;
   Taekwondo; Table Tennis|ping pong; Badminton; Water Polo; Shooting; Handball;
   Field Hockey|hockey; Triathlon; Rugby|rugby sevens; Canoeing|kayaking|canoe|kayak;
   Sport Climbing|climbing|rock climbing; Breaking|breakdancing|breakdance;
   Modern Pentathlon|pentathlon; Artistic Swimming|synchronized swimming|synchronised swimming`,
);

const WINTER_SPORTS = category(
  "Name a Winter Olympic sport",
  `Ice Hockey|hockey; Figure Skating|skating|ice skating; Skiing|alpine skiing|downhill skiing|downhill;
   Snowboarding; Bobsled|bobsleigh; Speed Skating; Curling; Luge; Ski Jumping;
   Cross-Country Skiing|cross country; Skeleton; Biathlon;
   Freestyle Skiing|moguls|aerials; Short Track|short track speed skating; Nordic Combined;
   Ski Mountaineering|skimo`,
);

const LENGTH_UNITS = category(
  "Name a unit of length or distance",
  `Inch; Foot|feet; Yard; Mile; Meter|metre; Centimeter|centimetre|cm;
   Kilometer|kilometre|km; Millimeter|millimetre|mm; Light-year|light year; Nautical Mile;
   Micrometer|micrometre|micron; Nanometer|nanometre|nm; Furlong; League; Fathom; Hand;
   Parsec; Astronomical Unit|au; Angstrom; Cubit; Chain; Rod|perch|pole;
   Decimeter|decimetre; Picometer|picometre; Smoot`,
);

const BOND = category(
  "Name a James Bond film",
  `Goldfinger; Casino Royale; Skyfall; GoldenEye; Dr. No|doctor no; No Time to Die; Spectre;
   From Russia with Love; Live and Let Die; Thunderball; Moonraker; Quantum of Solace;
   Die Another Day; Tomorrow Never Dies; The Spy Who Loved Me; The World Is Not Enough;
   You Only Live Twice; Octopussy; For Your Eyes Only; Diamonds Are Forever;
   The Man with the Golden Gun; A View to a Kill; Licence to Kill|license to kill;
   On Her Majesty's Secret Service; The Living Daylights`,
);

export const KRILLION_PUZZLES: KrillionPuzzle[] = [
  { key: "k_7fq2m", rounds: [SOUTH_AMERICA, ZODIAC, NBA] },
  { key: "k_r9xd4", rounds: [US_STATES, GREEK_LETTERS, BOND] },
  { key: "k_b3wnz", rounds: [PLANETS, SHAKESPEARE, CANADA] },
  { key: "k_h6tpa", rounds: [EUROPE, NATO, LENGTH_UNITS] },
  { key: "k_m2kcy", rounds: [ELEMENTS, AUSTRALIA, MLB] },
  { key: "k_x8vje", rounds: [GREEK_GODS, STATE_CAPITALS, WINTER_SPORTS] },
  { key: "k_d4qsu", rounds: [PRESIDENTS, MONOPOLY, ASIA] },
  { key: "k_t5gzh", rounds: [EURO_CAPITALS, SUMMER_SPORTS, NFL] },
];

// ------------------------------------------------- Nokrillion: one obvious answer on top

const FRUIT = category(
  "Name a fruit",
  `Apple; Banana; Orange; Strawberry; Grape; Watermelon; Mango; Pineapple; Peach; Pear;
   Cherry; Blueberry; Lemon; Kiwi|kiwifruit|kiwi fruit; Raspberry; Plum; Coconut; Lime;
   Pomegranate; Grapefruit; Melon; Papaya; Apricot; Cantaloupe|rockmelon; Honeydew;
   Blackberry; Avocado; Tomato; Fig; Nectarine; Tangerine|mandarin; Clementine; Cranberry;
   Passion Fruit|passionfruit; Dragon Fruit|dragonfruit|pitaya; Guava; Lychee|litchi; Date;
   Persimmon; Starfruit|star fruit|carambola; Jackfruit; Durian; Kumquat; Quince; Gooseberry;
   Mulberry; Olive; Plantain; Tamarind; Elderberry`,
);

const FACE = category(
  "Name a part of the face",
  `Nose; Eyes|eye; Mouth; Lips|lip; Ears|ear; Cheeks|cheek; Chin; Eyebrows|eyebrow|brows|brow;
   Forehead; Teeth|tooth; Eyelashes|eyelash|lashes; Jaw|jawline; Tongue; Eyelids|eyelid;
   Nostrils|nostril; Temples|temple; Pupils|pupil; Dimples|dimple; Freckles|freckle; Iris;
   Cheekbones|cheekbone; Gums|gum; Philtrum`,
);

const CARS = category(
  "Name a car brand",
  `Toyota; Ford; Honda; Chevrolet|chevy; BMW; Tesla; Mercedes-Benz|mercedes|benz; Nissan;
   Ferrari; Jeep; Volkswagen|vw; Audi; Lamborghini|lambo; Porsche; Subaru; Hyundai; Kia;
   Mazda; Dodge; Lexus; Cadillac; Jaguar; Volvo; Land Rover|range rover; GMC; Buick;
   Chrysler; Lincoln; Mini|mini cooper; Mitsubishi; Fiat; Bentley; Rolls-Royce;
   Maserati; Aston Martin; Acura; Infiniti; Bugatti; McLaren; Alfa Romeo; Ram; Genesis;
   Peugeot; Renault; Rivian; Lotus; Pontiac; Saab; Suzuki; Polestar`,
);

const FARM = category(
  "Name a farm animal",
  `Cow|cattle|calf; Pig|hog|piglet|swine; Horse; Chicken|hen|chick; Sheep|lamb; Goat; Duck;
   Rooster; Donkey; Turkey; Goose; Llama; Dog; Cat; Bull|ox|steer; Rabbit|bunny; Alpaca;
   Pony; Mule; Bee|honeybee; Ostrich; Emu; Peacock`,
);

const COLOURS = category(
  "Name a colour",
  `Blue; Red; Green; Yellow; Purple; Orange; Pink; Black; White; Brown; Gray|grey; Teal;
   Turquoise; Gold; Silver; Navy|navy blue; Indigo; Violet; Maroon; Beige; Magenta;
   Lavender; Cyan; Burgundy; Tan; Crimson; Coral; Lime|lime green; Mint|mint green; Peach;
   Olive; Aqua; Ivory; Cream; Khaki; Mauve; Scarlet; Fuchsia; Charcoal; Salmon; Plum;
   Emerald; Amber; Cerulean; Periwinkle; Chartreuse; Ochre|ocher; Taupe; Sienna`,
);

const PASTA = category(
  "Name a pasta shape",
  `Spaghetti; Penne; Macaroni|mac|elbows|elbow macaroni; Fettuccine|fettuccini|fettucine;
   Lasagna|lasagne; Ravioli; Linguine|linguini; Rigatoni; Fusilli; Rotini;
   Bow Tie|bowtie|bow ties|farfalle; Tortellini; Angel Hair|capellini; Ziti; Orzo; Gnocchi;
   Shells|conchiglie|pasta shells; Pappardelle; Tagliatelle; Orecchiette; Manicotti;
   Cannelloni; Vermicelli; Bucatini; Ditalini; Rotelle|wagon wheels; Cavatappi; Gemelli;
   Radiatori; Campanelle; Paccheri; Acini di Pepe`,
);

const VEGETABLES = category(
  "Name a vegetable",
  `Carrot; Broccoli; Potato; Lettuce; Corn; Celery; Spinach; Cucumber; Tomato; Onion;
   Peas|pea; Green Beans|beans|string beans|green bean; Cauliflower; Pepper|bell pepper;
   Cabbage; Zucchini|courgette; Asparagus; Kale; Sweet Potato|yam;
   Brussels Sprouts|brussel sprouts|sprouts; Eggplant|aubergine; Mushroom; Radish;
   Beet|beetroot; Squash; Garlic; Artichoke; Turnip; Leek; Okra; Pumpkin; Bok Choy;
   Parsnip; Arugula|rocket; Collard Greens|collards; Rutabaga|swede; Jalapeno;
   Chard|swiss chard; Fennel; Scallion|green onion|spring onion; Shallot; Watercress;
   Endive; Kohlrabi; Edamame; Jicama; Daikon`,
);

const INSTRUMENTS = category(
  "Name a musical instrument",
  `Guitar; Piano; Drums|drum; Violin|fiddle; Flute; Trumpet; Saxophone|sax; Clarinet; Cello;
   Harp; Bass|bass guitar; Trombone; Ukulele|uke; Harmonica; Tuba; Keyboard; Banjo;
   Xylophone; Accordion; Oboe; Tambourine; French Horn|horn; Viola; Recorder; Triangle;
   Bagpipes|bagpipe; Double Bass|upright bass|contrabass; Mandolin; Bassoon; Piccolo; Organ;
   Synthesizer|synth; Cymbals|cymbal; Sitar; Didgeridoo; Marimba; Glockenspiel; Harpsichord;
   Kazoo; Bongos|bongo; Maracas; Timpani; Cowbell; Lute; Steel Drum|steel pan; Theremin;
   Bugle; Castanets`,
);

const PRINCESSES = category(
  "Name a Disney princess",
  `Cinderella; Ariel; Belle; Jasmine; Snow White; Aurora|sleeping beauty; Rapunzel; Mulan;
   Pocahontas; Tiana; Moana; Merida; Elsa; Anna; Raya`,
);

const TOPPINGS = category(
  "Name a pizza topping",
  `Pepperoni; Cheese|extra cheese|mozzarella; Sausage; Mushrooms|mushroom; Pineapple;
   Onions|onion; Olives|olive|black olives; Green Peppers|peppers|bell peppers|green pepper;
   Bacon; Ham; Chicken; Jalapenos|jalapeno; Spinach; Tomatoes|tomato;
   Anchovies|anchovy; Ground Beef|beef|hamburger; Basil; Garlic; Meatballs|meatball; Salami;
   Artichokes|artichoke; Feta; Banana Peppers; Prosciutto; Pesto; Ricotta; Arugula;
   Sun-Dried Tomatoes; Broccoli; Corn; Egg; Shrimp; Capers; Parmesan`,
);

const FURNITURE = category(
  "Name a piece of furniture",
  `Chair; Table; Couch|sofa; Bed; Desk; Dresser|chest of drawers; Bookshelf|bookcase|shelf;
   Lamp; Nightstand|bedside table; Recliner; Coffee Table; Armchair; Ottoman|footstool;
   Stool|bar stool; Bench; Cabinet|cupboard; Wardrobe|armoire; Futon; Rocking Chair;
   Bunk Bed; Crib|cot; TV Stand|entertainment center; Loveseat|love seat; Vanity;
   Hutch|china cabinet; Sectional; Chaise Lounge|chaise longue|chaise; Bean Bag|beanbag;
   Office Chair|desk chair; Dining Table; Sideboard|buffet|credenza; Headboard; Mirror`,
);

const SHAPES = category(
  "Name a shape",
  `Circle; Square; Triangle; Rectangle; Star; Heart; Oval; Diamond|rhombus; Pentagon;
   Hexagon; Octagon; Trapezoid|trapezium; Cube; Sphere; Pyramid; Parallelogram; Cylinder;
   Cone; Crescent; Semicircle|half circle; Ellipse; Heptagon; Kite; Arrow; Cross; Decagon;
   Prism; Spiral; Nonagon; Torus|donut; Tetrahedron; Dodecahedron; Octahedron`,
);

const ICE_CREAM = category(
  "Name an ice cream flavour",
  `Chocolate; Vanilla; Strawberry; Mint Chocolate Chip|mint chip|mint choc chip|mint;
   Cookies and Cream|cookies n cream|cookies & cream|oreo;
   Cookie Dough|chocolate chip cookie dough; Rocky Road; Butter Pecan; Neapolitan; Pistachio;
   Chocolate Chip; Coffee; Salted Caramel|caramel; Birthday Cake|cake batter;
   Peanut Butter|peanut butter cup; French Vanilla; Moose Tracks; Coconut;
   Black Cherry|cherry; Mango; Rum Raisin; Banana; Matcha|green tea; Peach;
   Chocolate Fudge Brownie|brownie|fudge brownie; Cheesecake; Cotton Candy; Bubblegum;
   Blueberry; Pralines and Cream|praline; Dulce de Leche; Maple Walnut;
   Toffee|english toffee; Spumoni; Stracciatella; Tutti Frutti; Ube; Pumpkin`,
);

const DINOSAURS = category(
  "Name a dinosaur",
  `Tyrannosaurus Rex|t rex|trex|tyrannosaurus|t-rex; Triceratops; Velociraptor|raptor;
   Stegosaurus; Brachiosaurus; Brontosaurus; Pterodactyl; Spinosaurus; Diplodocus;
   Ankylosaurus; Allosaurus; Apatosaurus; Parasaurolophus; Iguanodon; Pachycephalosaurus;
   Pteranodon; Dilophosaurus; Giganotosaurus; Carnotaurus; Archaeopteryx; Mosasaurus;
   Plesiosaurus|plesiosaur; Gallimimus; Compsognathus; Utahraptor; Deinonychus; Oviraptor;
   Argentinosaurus; Therizinosaurus; Baryonyx; Microraptor; Protoceratops; Maiasaura;
   Megalosaurus; Edmontosaurus; Styracosaurus; Albertosaurus`,
);

const ROOMS = category(
  "Name a room in a house",
  `Kitchen; Bedroom|master bedroom; Bathroom; Living Room|lounge|family room; Dining Room;
   Garage; Basement|cellar; Attic|loft; Office|study|home office; Laundry Room|laundry|utility room;
   Closet|walk-in closet; Hallway|hall; Den; Guest Room|spare room|guest bedroom;
   Playroom|games room|rec room; Pantry; Nursery; Sunroom|conservatory; Foyer|entryway;
   Mudroom; Library; Gym|home gym; Media Room|home theater|theater room|cinema room;
   Powder Room`,
);

const CHEESES = category(
  "Name a cheese",
  `Cheddar; Mozzarella; Swiss; Parmesan|parmigiano reggiano|parmigiano; American; Brie;
   Gouda; Provolone; Feta; Pepper Jack; Monterey Jack|jack; Blue Cheese|bleu cheese|blue;
   Colby|colby jack; Cream Cheese; Goat Cheese|chevre; Ricotta; Camembert; Gruyere;
   Havarti; Muenster|munster; Cottage Cheese; Gorgonzola; Manchego; Halloumi; Stilton;
   Roquefort; Burrata; Asiago; Romano|pecorino|pecorino romano; Emmental|emmentaler; Edam;
   Mascarpone; Fontina; Limburger; Paneer; Queso Fresco; String Cheese; Velveeta;
   Wensleydale; Jarlsberg; Raclette; Taleggio; Comte; Oaxaca`,
);

const DOGS = category(
  "Name a dog breed",
  `Labrador Retriever|labrador|lab; Golden Retriever|golden; German Shepherd; Poodle;
   Bulldog|english bulldog; Beagle; Chihuahua; Pug; Husky|siberian husky;
   Dachshund|wiener dog|sausage dog; Rottweiler; Boxer; Pit Bull|pitbull|american pit bull terrier;
   Yorkshire Terrier|yorkie; Shih Tzu; Corgi|welsh corgi|pembroke welsh corgi;
   French Bulldog|frenchie; Great Dane; Border Collie|collie; Doberman|doberman pinscher;
   Dalmatian; Australian Shepherd|aussie; Saint Bernard|st bernard; Pomeranian; Maltese;
   Bernese Mountain Dog|bernese; Cocker Spaniel|spaniel; Greyhound; Bloodhound; Basset Hound;
   Jack Russell Terrier|jack russell; Shiba Inu|shiba; Mastiff; Schnauzer; Bichon Frise|bichon;
   Akita; Labradoodle; Goldendoodle; Newfoundland; Samoyed; Weimaraner;
   Pointer|german shorthaired pointer; Whippet;
   Cavalier King Charles Spaniel|cavalier|king charles spaniel; Boston Terrier;
   Chow Chow|chow; Shar Pei; Alaskan Malamute|malamute; Irish Setter|setter; Afghan Hound`,
);

const SUBJECTS = category(
  "Name a school subject",
  `Math|maths|mathematics; English; Science; History; Art; Music; Gym|pe|physical education;
   Spanish; Biology; Chemistry; Physics; Geography; French; Reading; Social Studies; Algebra;
   Geometry; Computer Science|computing|coding|it; Health; Drama|theater|theatre; Economics;
   Psychology; Calculus; Latin; Writing; Spelling; Home Economics|home ec; Literature;
   Government|civics; Philosophy; Statistics; German; Religious Studies|religion|re;
   Woodshop|shop|woodworking; Business; Sociology; Chinese|mandarin`,
);

const FLOWERS = category(
  "Name a flower",
  `Rose; Tulip; Daisy; Sunflower; Lily; Daffodil; Orchid; Carnation; Lavender; Dandelion;
   Lilac; Hydrangea; Marigold; Peony; Iris; Violet; Poppy; Chrysanthemum|mum; Begonia;
   Gardenia; Jasmine; Magnolia; Hibiscus; Lotus; Petunia; Geranium; Pansy; Zinnia; Azalea;
   Dahlia; Camellia; Gerbera|gerbera daisy; Snapdragon; Bluebell; Forget-Me-Not;
   Cherry Blossom|sakura; Lily of the Valley; Morning Glory; Foxglove; Buttercup; Anemone;
   Freesia; Gladiolus; Primrose; Rhododendron; Wisteria; Crocus; Hyacinth; Honeysuckle`,
);

const BALL_SPORTS = category(
  "Name a sport played with a ball",
  `Basketball; Football|american football; Soccer|association football; Baseball; Tennis;
   Volleyball|beach volleyball; Golf; Softball; Rugby; Cricket; Bowling; Dodgeball;
   Handball; Kickball; Water Polo; Lacrosse; Table Tennis|ping pong; Pickleball;
   Field Hockey|hockey; Racquetball; Squash; Billiards|pool|snooker; Polo; Croquet;
   Wiffle Ball|whiffle ball|wiffleball; Netball; Bocce|bocce ball; Four Square; Tetherball;
   Australian Rules Football|aussie rules|afl; Gaelic Football; Hurling; Jai Alai;
   Sepak Takraw`,
);

const APPLIANCES = category(
  "Name a kitchen appliance",
  `Microwave; Refrigerator|fridge; Toaster; Oven; Stove|stovetop|range|cooker; Blender;
   Dishwasher; Coffee Maker|coffee machine|coffeemaker; Air Fryer|airfryer; Toaster Oven;
   Freezer; Stand Mixer|mixer|kitchenaid; Food Processor; Kettle|electric kettle;
   Slow Cooker|crockpot|crock pot; Instant Pot|pressure cooker; Rice Cooker;
   Waffle Maker|waffle iron; Juicer; Garbage Disposal|disposal; Espresso Machine;
   Hand Mixer; Ice Maker; Bread Maker|bread machine; Deep Fryer|fryer;
   Panini Press|sandwich press|sandwich maker; Can Opener; Range Hood|extractor fan;
   Popcorn Maker; Dehydrator; Trash Compactor; Sous Vide; Wine Fridge|wine cooler; Hot Plate`,
);

const SEA = category(
  "Name a sea creature",
  `Shark; Whale; Dolphin; Octopus; Fish; Jellyfish; Starfish|sea star; Crab;
   Seahorse|sea horse; Lobster; Sea Turtle|turtle; Squid; Clownfish|clown fish|nemo;
   Stingray|ray|manta ray; Shrimp|prawn; Seal; Eel; Orca|killer whale; Clam; Oyster;
   Sea Lion; Walrus; Coral; Sea Urchin|urchin; Swordfish; Narwhal; Tuna;
   Pufferfish|blowfish|puffer fish; Sea Anemone|anemone; Manatee; Sea Otter|otter;
   Barracuda; Penguin; Great White Shark|great white; Hammerhead|hammerhead shark;
   Blue Whale; Beluga; Mussel; Krill; Plankton; Sea Cucumber; Anglerfish; Marlin; Scallop;
   Salmon; Sardine; Barnacle; Cuttlefish; Nautilus; Sea Slug|nudibranch`,
);

const BIRDS = category(
  "Name a bird",
  `Eagle|bald eagle; Robin; Pigeon; Crow; Parrot; Owl; Penguin; Cardinal; Blue Jay|bluejay;
   Hawk; Flamingo; Hummingbird; Sparrow; Duck; Chicken; Ostrich; Seagull|gull; Swan;
   Peacock|peafowl; Pelican; Woodpecker; Toucan; Falcon; Raven; Canary; Goose; Turkey; Dove;
   Vulture; Parakeet|budgie; Emu; Crane; Heron; Stork; Kiwi; Finch; Mockingbird; Magpie;
   Starling; Kingfisher; Puffin; Condor; Albatross; Roadrunner; Cockatoo; Macaw; Oriole;
   Wren; Osprey; Swallow`,
);

const TOOLS = category(
  "Name a tool in a toolbox",
  `Hammer; Screwdriver; Wrench|spanner; Pliers; Tape Measure|measuring tape;
   Saw|handsaw; Drill|power drill; Level|spirit level; Utility Knife|box cutter|knife|stanley knife;
   Allen Key|allen wrench|hex key; Flashlight|torch; Socket Wrench|ratchet; Chisel; File;
   Clamp; Mallet; Crowbar|pry bar; Sandpaper; Staple Gun; Wire Cutters|wire cutter;
   Vise Grips|locking pliers; Hacksaw; Square|speed square|try square; Pencil;
   Stud Finder; Glue Gun|hot glue gun; Duct Tape|tape; Pipe Wrench; Awl; Putty Knife;
   Multimeter; Soldering Iron; Caulk Gun|caulking gun`,
);

export const NOKRILLION_PUZZLES: KrillionPuzzle[] = [
  { key: "n_c8ruw", rounds: [FRUIT, FACE, CARS] },
  { key: "n_p3yka", rounds: [FARM, COLOURS, PASTA] },
  { key: "n_f6mde", rounds: [VEGETABLES, INSTRUMENTS, PRINCESSES] },
  { key: "n_z2hxq", rounds: [TOPPINGS, FURNITURE, SHAPES] },
  { key: "n_j9sbt", rounds: [ICE_CREAM, DINOSAURS, ROOMS] },
  { key: "n_w4neg", rounds: [CHEESES, DOGS, SUBJECTS] },
  { key: "n_a7vkr", rounds: [FLOWERS, BALL_SPORTS, APPLIANCES] },
  { key: "n_q5ldy", rounds: [SEA, BIRDS, TOOLS] },
];
