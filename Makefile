all: latest-map www/maplist.js resource-availability

.PHONY: all latest-map multiple-maps test-factorio
.DELETE_ON_ERROR:

factorio_dir ?= ../Factorio
factorio_data ?= ${factorio_dir}/data
factorio_exe ?= ${factorio_dir}/bin/debug/factorio
factorio_test_exe ?= ${factorio_dir}/bin/debug/test

${factorio_exe}: $(shell find ${factorio_dir}/src)
	make -C "${factorio_dir}"

.factorio-help.txt: ${factorio_exe}
	${factorio_exe} --help >"$@"

.map-preview-capabilities.sh: .factorio-help.txt bin/figure-map-preview-capabilities
	bin/figure-map-preview-capabilities "$<" > "$@"

${factorio_test_exe}: $(shell find ${factorio_dir}/src)
	make -C "${factorio_dir}" test

test-factorio: ${factorio_test_exe}
	${factorio_test_exe}

www/maplist.js: $(shell find map-previews) bin/generate-map-preview-list
	bin/generate-map-preview-list >"$@"

latest-map: ${factorio_exe} ${factorio_data} bin/generate-test-map-previews .map-preview-capabilities.sh
	bin/generate-test-map-previews --ignore-existing --description-from-commit

resource-availability: latest-map $(shell find map-previews -name '*.log')
	mkdir -p "$@"
	bin/generate-resource-availability-csv --outfile-prefix="$@/"
	touch "$@"

multiple-maps: ${factorio_exe} ${factorio_data} bin/generate-test-map-previews .map-preview-capabilities.sh
	bin/generate-test-map-previews --seed "1 11 21 31 41 51 61 71 81 91 101 111 121 131 141 151 161 171 181 191" \
		--ignore-existing --description-from-commit \
		--after-each-map "${MAKE}"
