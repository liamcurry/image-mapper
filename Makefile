STYLUS = node node_modules/.bin/stylus

all: clean build
build: build_node
clean: clean_osx clean_node

build_node:
	npm install

clean_node:
	rm -Rf node_modules

reset_node: clean_node build_node

clean_os:
	find . -name ".DS_Store" -delete

run:
	python -m SimpleHTTPServer 8002

watch_css:
	$(STYLUS) -u nib -c --include-css -w css/*.styl

.PHONY: run shell clean_os build_node reset_node
