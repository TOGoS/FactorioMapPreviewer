(function() {
	var leftPad = function(str, padStr, targetLength) {
		while( str.length < targetLength ) {
			str = padStr + str;
		}
		return str;
	};
	
	/**
	 * @param maps map name => { "scales" => { "0.5" => { "imagePath" => "foo/foo.scale0.5.png" } } }
	 */
	var Viewer = function() {
		this.mapImg = undefined;
		this.coordsSpan = undefined;
		this.scales = Viewer.standardScales;
		this.currentScaleIndex = 1;
		this.currentMapIndex = 0
		this.cursorPixelPosition = [0,0];
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
		this.updateView();
	};
	Viewer.prototype.setScale = function(scale) {
		let idx = this.scales.indexOf(scale);
		if( idx != -1 && idx != this.currentScaleIndex ) {
			this.currentScaleIndex = idx;
			this.updateView();
		}
	};
	Viewer.prototype.goToMap = function(mapName) {
		if( typeof mapName == 'number' ) {
			if( mapName == this.currentMapIndex ) return;
			if( mapName < 0 ) mapName = 0;
			if( mapName >= this.mapNames.length ) mapName = this.mapNames.length - 1;
			this.currentMapIndex = mapName|0;
			this.updateView();
			return;
		}
		
		if( mapName == this.mapNames[this.currentMapIndex] ) return;
		let idx = this.mapNames.indexOf(mapName);
		if( idx != -1 ) {
			this.currentMapIndex = idx;
			this.updateView();
		}
	};
	Viewer.prototype.zoomIn = function() {
		if( this.currentScaleIndex > 0 ) {
			--this.currentScaleIndex;
			this.updateView();
		}
	};
	Viewer.prototype.zoomOut = function() {
		if( this.currentScaleIndex < this.scales.length-1 ) {
			++this.currentScaleIndex;
			this.updateView();
		}
	};
	
	Viewer.prototype.onMouseMove = function( mmEvt ) {
		this.cursorPixelPosition = [
			(mmEvt.clientX - this.mapImg.offsetLeft) - 512,
			(mmEvt.clientY - this.mapImg.offsetTop) - 512
		];
		this.updateCursorCoords();
	};
	Viewer.prototype.updateCursorCoords = function() {
		let scale = this.scales[this.currentScaleIndex];
		let worldOffsetX = this.cursorPixelPosition[0] * scale;
		let worldOffsetY = this.cursorPixelPosition[1] * scale;
		if( this.coordsSpan ) {
			this.coordsSpan.firstChild.nodeValue = worldOffsetX + "," + worldOffsetY;
		}
	};
	Viewer.prototype.onWheel = function( wheelEvent ) {
		if( wheelEvent.deltaY > 0 ) this.zoomOut();
		if( wheelEvent.deltaY < 0 ) this.zoomIn();
	};
	Viewer.prototype.onKey = function( keyEvent ) {
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
		this.mapImg.src = scaleInfo.imagePath;
		if( window.history ) {
			window.history.replaceState({ mapName, scale: currentScale }, "", "#mapName="+mapName+"&scale="+currentScale);
		}
	};

	window.Viewer = Viewer;
})();
