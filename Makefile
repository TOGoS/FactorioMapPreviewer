www/maplist.js: $(shell find map-previews)
	bin/generate-map-preview-list >"$@"
