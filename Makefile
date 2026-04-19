REPO_ROOT := $(patsubst %/,%,$(dir $(abspath $(lastword $(MAKEFILE_LIST)))))
BUILD_DIR := $(REPO_ROOT)/docs

.PHONY: build
build:
	cd $(REPO_ROOT)/app && npm install && npm run build-all

.PHONY: test
test:
	cd $(REPO_ROOT)/app && npm install && npm test

.PHONY: generate
generate: clean build
	mkdir -p $(BUILD_DIR)
	cp -R $(REPO_ROOT)/public/. $(BUILD_DIR)/
	echo "thomas.helbling.fr" > $(BUILD_DIR)/CNAME

.PHONY: audio
audio:
	$(REPO_ROOT)/app/scripts/generate_audio.py

.PHONY: audio-en
audio-en:
	$(REPO_ROOT)/app/scripts/generate_audio.py english

.PHONY: audio-es
audio-es:
	$(REPO_ROOT)/app/scripts/generate_audio.py spanish

.PHONY: local
local: build
	cd $(REPO_ROOT)/public && python3 -m http.server 8080

.PHONY: clean
clean:
	rm -rf $(BUILD_DIR)
	rm -rf $(REPO_ROOT)/public/js
	rm -rf $(REPO_ROOT)/app/dist
