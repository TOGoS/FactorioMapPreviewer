(function() {
	var leftPad = function(str, padStr, targetLength) {
		while( str.length < targetLength ) {
			str = padStr + str;
		}
		return str;
	};

	function parseCsv(csv, rowCallback) {
		let rows = csv.split("\n");
		for( let r in rows ) {
			let row = rows[r].split(",");
			rowCallback(row);
		}
	}
	
	function TilePropertiesBuffer(headers, data) {
		this.headers = headers;
		this.data = Float32Array.from(data);
	}
	TilePropertiesBuffer.prototype.getPropertiesAt = function(index) {
		let props = {};
		for( let i=0; i<this.headers.length; ++i ) {
			props[this.headers[i]] = this.data[this.headers.length*index + i];
		}
		return props;
	}
	
	function fetchTilePropertiesFromFile(url) {
		return fetch(url).then( res => {
			if( !res.ok ) return Promise.reject(new Error(res.status));
			return res.text().then( csv => {
				let headers = undefined;
				let data = [];
				parseCsv(csv, row => {
					if( headers == undefined ) headers = row;
					else {
						for( let i=0; i<headers.length; ++i ) {
							data.push(row[i]);
						}
					}
				});
				return new TilePropertiesBuffer(headers,data);
			});
		});
	}
	
	/**
	 * @param maps map name => { "scales" => { "0.5" => { "imagePath" => "foo/foo.scale0.5.png" } } }
	 */
	var Viewer = function() {
		this.mapImg = undefined;
		this.coordsSpan = undefined;
		this.scales = Viewer.standardScales;
		this.currentScaleIndex = 1;
		this.currentMapIndex = this
		this.cursorPixelPosition = {x:0, y:0};
	};
	Viewer.prototype.fetchTileProperties = function( mapName, scale ) {
		let map = this.maps[mapName];
		if( map == undefined ) return Promise.reject("No map "+mapName);
		let scaleInfo = map.scales[scale];
		if( scaleInfo == undefined ) return Promise.reject("No scale "+scale+" for map "+mapName);
		if( scaleInfo.tilePropertiesCsvPath == undefined ) return Promise.reject("No tile properties CSV path for map "+mapName+" scale "+scale);
		let tpProm = scaleInfo.tilePropertiesPromise;
		if( tpProm ) return tpProm;
		
		scaleInfo.tilePropertiesStatus = {code:"loading", message:"Loading..."};
		this.updateView();
		
		scaleInfo.tilePropertiesPromise = tpProm = fetchTilePropertiesFromFile(scaleInfo.tilePropertiesCsvPath);
		tpProm.then( (tileProps) => {
			scaleInfo.tilePropertiesStatus = {code:"loaded", message:"Loaded!"};
			scaleInfo.tileProperties = tileProps;
		}, (e) => {
			scaleInfo.tilePropertiesStatus = {code:"error", message:"Error: "+e.message};
		}).then( () => {
			this.updateView();
		});
		
		return tpProm;
	};
	Viewer.prototype.fetchTilePropertiesForCurrentView = function() {
		return this.fetchTileProperties(this.mapNames[this.currentMapIndex], this.scales[this.currentScaleIndex]);
	};
	Viewer.prototype.setMapInfo = function( maps ) {
		this.maps = maps;
		this.mapNames = [];
		for( let m in maps ) {
			this.mapNames.push(m);
		}
		console.log("Loaded "+this.mapNames.length+" maps");
	}
	
	Viewer.standardScales = [0.5, 1, 2, 4, 8, 16, 32, 100];
	Viewer.formatScale = function(scale) {
		return leftPad(scale.toFixed(1), "0", 5);
	};
	
	Viewer.prototype.alterMapIndex = function(delta) {
		this.currentMapIndex += delta;
		while( this.currentMapIndex >= this.mapNames.length ) this.currentMapIndex -= this.mapNames.length;
		while( this.currentMapIndex < 0 ) this.currentMapIndex += this.mapNames.length;
		this.mapChanged();
	};
	Viewer.prototype.setScale = function(scale) {
		let idx = this.scales.indexOf(scale);
		if( idx != -1 && idx != this.currentScaleIndex ) {
			this.currentScaleIndex = idx;
			this.mapChanged();
		}
	};
	Viewer.prototype.goToMap = function(mapName) {
		if( typeof mapName == 'number' ) {
			if( mapName == this.currentMapIndex ) return;
			if( mapName < 0 ) mapName = 0;
			if( mapName >= this.mapNames.length ) mapName = this.mapNames.length - 1;
			this.currentMapIndex = mapName|0;
			this.mapChanged();
			return;
		}
		
		if( mapName == this.mapNames[this.currentMapIndex] ) return;
		let idx = this.mapNames.indexOf(mapName);
		if( idx != -1 ) {
			this.currentMapIndex = idx;
			this.mapChanged();
		}
	};
	Viewer.prototype.zoomIn = function() {
		if( this.currentScaleIndex > 0 ) {
			--this.currentScaleIndex;
			this.mapChanged();
		}
	};
	Viewer.prototype.zoomOut = function() {
		if( this.currentScaleIndex < this.scales.length-1 ) {
			++this.currentScaleIndex;
			this.mapChanged();
		}
	};
	
	Viewer.prototype.onMouseMove = function( mmEvt ) {
		this.cursorPixelPosition = {
			x: (mmEvt.clientX - this.mapImg.offsetLeft),
			y: (mmEvt.clientY - this.mapImg.offsetTop)
		};
		this.updateView();
	};
	Viewer.prototype.onWheel = function( wheelEvent ) {
		if( wheelEvent.deltaY > 0 ) this.zoomOut();
		if( wheelEvent.deltaY < 0 ) this.zoomIn();
		wheelEvent.preventDefault();
		wheelEvent.stopPropagation();
	};
	Viewer.prototype.onKey = function( keyEvent ) {
		if( keyEvent.keyCode == 73 ) {
			this.fetchTilePropertiesForCurrentView();
			return;
		}
		if( keyEvent.keyCode == 38 || keyEvent.keyCode == 87 ) {
		   this.zoomIn();
			keyEvent.preventDefault();
			keyEvent.stopPropagation();
			return;
		}
		if( keyEvent.keyCode == 40 || keyEvent.keyCode == 83 ) {
		   this.zoomOut();
			keyEvent.preventDefault();
			keyEvent.stopPropagation();
			return;
		}
		if( keyEvent.keyCode == 39 || keyEvent.keyCode == 68 ) {
			this.alterMapIndex(+1);
			keyEvent.preventDefault();
			keyEvent.stopPropagation();
			return;
		}
		if( keyEvent.keyCode == 37 || keyEvent.keyCode == 65 ) {
			this.alterMapIndex(-1);
			keyEvent.preventDefault();
			keyEvent.stopPropagation();
			return;
		}
		if( keyEvent.keyCode == 35 ) {
			this.goToMap(this.mapNames.length-1);
			keyEvent.preventDefault();
			keyEvent.stopPropagation();
			return;
		}
		if( keyEvent.keyCode == 36 ) {
			this.goToMap(0);
			keyEvent.preventDefault();
			keyEvent.stopPropagation();
			return;
		}
		console.log("Key "+keyEvent.keyCode);
	};
	Viewer.prototype.mapChanged = function() {
		//this.fetchTilePropertiesForCurrentView();
		let currentScale = this.scales[this.currentScaleIndex];
		let mapName = this.mapNames[this.currentMapIndex];
		if( window.history ) {
			window.history.replaceState({ mapName, scale: currentScale }, "", "#mapName="+mapName+"&scale="+currentScale);
		}
		this.updateView();
	};
	Viewer.prototype.updateCursorCoords = function() {
		let scale = this.scales[this.currentScaleIndex];
		let worldOffsetX = (this.cursorPixelPosition.x - 512) * scale;
		let worldOffsetY = (this.cursorPixelPosition.y - 512) * scale;
		if( this.coordsSpan ) {
			this.coordsSpan.firstChild.nodeValue = worldOffsetX + "," + worldOffsetY;
		}
	};
	Viewer.prototype.updateView = function() {
		this.updateCursorCoords();
		let currentScale = this.scales[this.currentScaleIndex];
		let mapName = this.mapNames[this.currentMapIndex];
		this.mapNameSpan.firstChild.nodeValue = mapName;
		this.scaleSpan.firstChild.nodeValue = currentScale;
		if( !mapName ) throw new Error("No map at index " + this.currentMapIndex);
		let map = this.maps[mapName];
		if( !map ) throw new Error("No map with name '" + mapName + "'");
		this.mapCTimeSpan.firstChild.nodeValue = map.creationTime ? ("" + map.creationTime) : "";
		this.mapDescriptionSpan.firstChild.nodeValue = map.description || "";
		let scaleInfo = map.scales[currentScale];
		if( scaleInfo ) {
			let tpLoadStat = scaleInfo.tilePropertiesStatus || {code:"not-loaded", message:"Not loaded; hit 'i' to load"};
			let tpLoadColor = 'inherit';
			switch( tpLoadStat.code ) {
			case 'error': tpLoadColor = 'red'; break;
			case 'loaded': tpLoadColor = 'lime'; break;
			case 'loading': tpLoadColor = 'yellow'; break;
			}
			
			this.tilePropertiesStatusSpan.firstChild.nodeValue = tpLoadStat.message;
			this.tilePropertiesStatusSpan.style.color = tpLoadColor;
			
			this.mapImg.src = scaleInfo.imagePath;

			if( scaleInfo.tileProperties ) {
				let idx = this.cursorPixelPosition.y * 1024 + this.cursorPixelPosition.x;
				this.updateTilePropertiesInfo(scaleInfo.tileProperties.getPropertiesAt(idx));
			} else {
				this.updateTilePropertiesInfo(undefined);
			}
		} else {
			this.tilePropertiesStatusSpan.firstChild.nodeValue = "???";
			this.mapImg.src = "data:text/plain,no image at scale "+currentScale;
			this.tilePropertiesTable.style.display = 'none';
		}
	};
	Viewer.prototype.updateTilePropertiesInfo = function(props) {
		if( props == undefined ) {
			this.tilePropertiesTable.style.display = 'none';
			return;
		}
		
		this.tilePropertiesTable.style.display = null; // Normal!
		// if( this.tilePropertiesCells == undefined ) this.tilePropertiesCells = {};
		while( this.tilePropertiesTable.firstChild ) {
			this.tilePropertiesTable.removeChild(this.tilePropertiesTable.firstChild);
		}
		for( let k in props ) {
			let row = document.createElement("tr");
			let label = document.createElement("th");
			label.setAttribute('align','left');
			label.appendChild(document.createTextNode(k));
			row.appendChild(label);
			let valueCell = document.createElement("td");
			valueCell.setAttribute('align','right');
			valueCell.appendChild(document.createTextNode((+props[k]).toFixed(4)));
			row.appendChild(valueCell);
			this.tilePropertiesTable.appendChild(row);
		}
	};

	window.Viewer = Viewer;
})();
