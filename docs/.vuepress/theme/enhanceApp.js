import Vuex from "vuex";
import CodeToggle from "./components/CodeToggle";
import PreHeading from "./components/PreHeading";
import PostHeading from "./components/PostHeading";
import { setStorage } from "./Storage";

export default ({ Vue, options, router, siteData }) => {
  const base = siteData.base;

  Vue.component("code-toggle", CodeToggle);
  Vue.component("pre-heading", PreHeading);
  Vue.component("post-heading", PostHeading);

  Vue.use(Vuex);

  Vue.mixin({
    data() {
      return {
        version: null
      };
    },
    computed: {
      $title() {
        const page = this.$page;

        // completely override title from frontmatter
        if (page.frontmatter.title) {
          return page.frontmatter.title;
        }

        // get explicit (frontmatter) or inferred page title
        const pageTitle = page.title ? page.title.replace(/[_`]/g, "") : "";

        // doc set title, global site title, or fall back to `VuePress`
        const siteTitle =
          this.$localeConfig.title || this.$siteTitle || "VuePress";

        if (pageTitle && siteTitle) {
          return `${pageTitle} | ${siteTitle}`;
        }

        return siteTitle;
      },
      $siteTitle() {
        //return this.$localeConfig.title || this.$site.title || ''
        return this.$themeConfig.title || this.$site.title || "";
      },
      $activeSet() {
        const { themeConfig } = this.$site;

        for (let index = 0; index < themeConfig.docSets.length; index++) {
          const set = themeConfig.docSets[index];

          if (set.versions) {
            for (let version of set.versions) {
              const key = version[0];
              const setVersionBase =
                (set.baseDir ? "/" + set.baseDir : "") + "/" + key;
              const searchPattern = new RegExp("^" + setVersionBase, "i");

              if (searchPattern.test(this.$page.path)) {
                this.version = key;
                return set;
              }
            }
          } else {
            const setVersionBase = set.baseDir ? "/" + set.baseDir : "";
            const searchPattern = new RegExp("^" + setVersionBase, "i");

            if (searchPattern.test(this.$page.path)) {
              return set;
            }
          }
        }

        return false;
      },
      $activeVersion() {
        if (this.$activeSet && !this.$activeSet.versions) {
          //console.log("no versions in set");
          return;
        }

        if (this.version) {
          //console.log("version: " + this.version);
          return this.version;
        }

        if (
          this.$activeSet &&
          !this.version &&
          this.$activeSet.defaultVersion
        ) {
          //console.log("default version: " + this.$activeSet.defaultVersion);
          return this.$activeSet.defaultVersion;
        }
      },
      $allLocales() {
        // include locales from each doc set so VuePress knows about them
        const { locales = {} } = this.$site;
        const { docSets = {} } = this.$themeConfig;

        let allLocales = locales;
        let docSetLocales = {};

        docSets.forEach(docSet => {
          if (docSet.locales) {
            for (const key in docSet.locales) {
              if (docSet.locales.hasOwnProperty(key)) {
                // modify locale key to include set base and version
                const settings = docSet.locales[key];
                let basePath = docSet.baseDir;

                if (docSet.versions) {
                  for (let i = 0; i < docSet.versions.length; i++) {
                    const version = docSet.versions[i];

                    let versionLabel = version[0];
                    if (basePath === "") {
                      basePath = "/";
                    }

                    let localeKey = `${basePath}${versionLabel}${key}`;
                    docSetLocales[localeKey] = settings;
                  }
                } else {
                  let localeKey = `${basePath}${key}`;
                  docSetLocales[localeKey] = settings;
                }
              }
            }
          }
        });

        Object.assign(allLocales, docSetLocales);

        return allLocales;
      },
      $localeConfig() {
        let targetLang;
        let defaultLang;

        for (const path in this.$allLocales) {
          if (path === "/") {
            defaultLang = this.$allLocales[path];
          } else if (this.$page.path.indexOf(path) === 0) {
            targetLang = this.$allLocales[path];
          }
        }

        return targetLang || defaultLang || {};
      }
    },
    $themeLocaleConfig() {
      // locale path with version support
      const localePath = this.$activeVersion
        ? "/" + this.$activeVersion + "/" + this.$localePath
        : this.$localePath;

      return (this.$allLocales || {})[localePath] || {};
    }
  });

  Object.assign(options, {
    data: {
      codeLanguage: null
    },

    store: new Vuex.Store({
      state: {
        codeLanguage: null
      },
      mutations: {
        changeCodeLanguage(state, language) {
          state.codeLanguage = language;
          setStorage("codeLanguage", language, base);
        }
      }
    })
  });
};
