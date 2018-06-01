const enumHelper = {
  logTypes: {
    action: 'ACTION',
    move: 'MOVE',
    pvp: 'PVP'
  },

  map: {
    types: {
      town: 'Town'
    },
    biomes: {
      land: 'Land',
      coast: 'Coast',
      town: 'Town',
      haunted: 'Haunted',
      forest: 'Forest',
      plains: 'Plains',
      mountains: 'Mountains',
      swamp: 'Swamp',
      grassland: 'Grassland',
      caves: 'Caves',
      plateau: 'Plateau',
      moors: 'Moors',
      desert: 'Desert'
    }
  },

  battle: {
    outcomes: {
      win: 'win',
      lost: 'lost',
      fled: 'fled'
    }
  },

  inventory: {
    maxEquipmentAmount: 10,
    maxItemAmount: 25,
    name: 'Inventory',
    position: 'inventory'
  },

  maxHealth: (level) => {
    return 100 + (level * 5);
  },

  maxMana: (level) => {
    return 50 + (level * 5);
  },

  equipment: {
    starter: {
      weapon: {
        name: 'Training Sword',
        power: 0.75,
        position: 'weapon',
        attackType: 'melee',
        previousOwners: []
      },
      armor: {
        name: 'Linen Shirt',
        power: 0.75,
        position: 'armor',
        previousOwners: []
      }
    },
    empty: {
      helmet: {
        name: 'Nothing',
        power: 0.15,
        position: 'helmet',
        previousOwners: []
      },
      armor: {
        name: 'Nothing',
        power: 0.15,
        position: 'armor',
        previousOwners: []
      },
      weapon: {
        name: 'Fist',
        power: 0.15,
        position: 'weapon',
        attackType: 'melee',
        previousOwners: []
      },
      relic: {
        name: 'Nothing',
        str: 0,
        dex: 0,
        end: 0,
        int: 0,
        luk: 0,
        position: 'relic',
        previousOwners: []
      }
    },
    types: {
      helmet: {
        name: 'Helmet',
        position: 'helmet'
      },
      armor: {
        name: 'Armor',
        position: 'armor'
      },
      weapon: {
        name: 'Weapon',
        position: 'weapon'
      },
      relic: {
        name: 'Relic',
        position: 'relic'
      }
    }
  },

  stats: {
    str: 'Strength',
    dex: 'Dexterity',
    end: 'Endurance',
    int: 'Intelligence',
    luk: 'Luck'
  },

  roamingNpcs: [
    pyddur = {
      name: 'Pyddur, God of Beer',
      discordId: 'pyddur'
    }
  ],

  mockPlayers: [{
    name: 'Statcheck01',
    discordId: 'Statcheck01'
  },
  {
    name: 'Statcheck02',
    discordId: 'Statcheck02'
  },
  {
    name: 'Statcheck03',
    discordId: 'Statcheck03'
  },
  {
    name: 'Statcheck04',
    discordId: 'Statcheck04'
  }],

  // source cited: https://en.wiktionary.org/wiki/Appendix:English_third-person_singular_pronouns
  genders: {
    male: {
      he: 'he',
      his: 'his',
      him: 'him',
      himself: 'himself',
    },
    female: {
      he: 'she',
      his: 'her',
      him: 'her',
      himself: 'herself',
    },
    neutral: {
      he: 'they',
      his: 'their',
      him: 'them',
      himself: 'themself',
    },
    neuter: {
      he: 'it',
      his: 'its',
      him: 'it',
      himself: 'itself',
    }
  },

  inventorySelectFields: {
    name: 1,
    stats: 1,
    equipment: 1,
    inventory: 1
  },

  playerEventLogSelectFields: {
    name: 1,
    pastEvents: 1
  },

  pvpLogSelectFields: {
    name: 1,
    stole: 1,
    stolen: 1,
    kills: 1,
    battles: 1,
    pastPvpEvents: 1
  },

  statsSelectFields: {
    name: 1,
    health: 1,
    class: 1,
    mana: 1,
    level: 1,
    'experience.current': 1,
    'experience.lost': 1,
    'experience.total': 1,
    gender: 1,
    events: 1,
    'gold.current': 1,
    'gold.lost': 1,
    'gold.stole': 1,
    'gold.stolen': 1,
    'gold.dailyLottery': 1,
    'gold.gambles.won': 1,
    'gold.gambles.lost': 1,
    'gold.total': 1,
    equipment: 1,
    map: 1,
    currentBounty: 1,
    stats: 1,
    createdAt: 1,
    gambles: 1,
    stole: 1,
    stolen: 1,
    spells: 1,
    kills: 1,
    battles: 1,
    deaths: 1,
    quest: 1,
    spellCast: 1
  },

  equipSelectFields: {
    name: 1,
    stats: 1,
    equipment: 1
  }
};
module.exports = enumHelper;