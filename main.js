
const { createApp, ref, computed } = Vue;

const DB_NAME = "herb-db";
const DB_STORE = "herbs";

function initDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE, { keyPath: "中文名" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function writeHerbsToDB(db, herbs) {
  const tx = db.transaction(DB_STORE, "readwrite");
  const store = tx.objectStore(DB_STORE);
  herbs.forEach(item => store.put(item));
  return tx.complete;
}

function readAllHerbsFromDB(db) {
  return new Promise(resolve => {
    const tx = db.transaction(DB_STORE, "readonly");
    const store = tx.objectStore(DB_STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
  });
}

async function loadHerbs() {
  const db = await initDB();
  if (!localStorage.getItem("herbs_imported")) {
    const herbs = await fetch("herbs.json").then(r => r.json());
    await writeHerbsToDB(db, herbs);
    localStorage.setItem("herbs_imported", "yes");
    return herbs;
  } else {
    return await readAllHerbsFromDB(db);
  }
}

const App = {
  async setup() {
    const search = ref('');
    const herbs = ref([]);
    const selected = ref(null);

    herbs.value = await loadHerbs();

    const filtered = computed(() =>
      herbs.value.filter(h =>
        h.中文名.includes(search.value) ||
        h.英文名.some(e => e.toLowerCase().includes(search.value.toLowerCase()))
      )
    );

    return { search, filtered, selected };
  },
  template: `
    <v-app>
      <v-main>
        <v-container fluid>
          <v-row>
            <v-col cols='4'>
              <v-text-field
                v-model='search'
                label='搜尋中藥材'
                prepend-inner-icon='mdi-magnify'
                density='compact'
                hide-details
                clearable
              />
              <v-list>
                <v-list-item
                  v-for='item in filtered'
                  :key='item.中文名'
                  @click='selected = item'
                >
                  <v-list-item-title>{{ item.中文名 }}</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-col>
            <v-col cols='8'>
              <v-card v-if='selected' class='pa-4' flat>
                <v-card-title class='text-h6'>{{ selected.中文名 }}</v-card-title>
                <v-card-subtitle>
                  <div v-for='e in selected.英文名' :key='e' v-if='e'>{{ e }}</div>
                </v-card-subtitle>
                <v-card-text>
                  <p>{{ selected.說明 }}</p>
                  <div v-if='selected.標準網址'>
                    <v-btn :href='selected.標準網址' target='_blank' color='primary' variant='tonal'>查看標準文件</v-btn>
                  </div>
                </v-card-text>
              </v-card>
              <v-card v-else class='pa-4' flat>
                <v-card-text>請從左側選擇一項中藥材</v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-container>
      </v-main>
    </v-app>
  `
};

const vuetify = Vuetify.createVuetify();
createApp(App).use(vuetify).mount('#app');
