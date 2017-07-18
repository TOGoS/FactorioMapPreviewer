all: www/maplist.js map-previews/resource-availability

.PHONY: all

www/maplist.js: $(shell find map-previews)
	bin/generate-map-preview-list >"$@"

map-previews/resource-availability: $(shell find map-previews -name '*.log')
	mkdir -p "$@"
	bin/generate-resource-availability-csv --outfile-prefix="$@/"
	touch "$@"
