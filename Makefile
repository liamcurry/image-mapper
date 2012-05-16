css:
	stylus --use nib --watch css

run:
	python -m SimpleHTTPServer

build:
	java -jar bin/compiler.jar --compilation_level ADVANCED_OPTIMIZATIONS \
		--js js/main.js > js/main.min.js

.PHONY: css run
