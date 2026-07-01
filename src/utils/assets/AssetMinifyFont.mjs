import opentype from 'opentype.js';

export default class AssetMinifyFont{
	
	glyphs = {
		en : 'ıŞÇÚÜŁÇÃÓÉÀÄÊŠÎÖQWERTYUIOPASDFGHJKLZXCVBNMışçúüłçãóööéêàäšîqwertyuiopasdfghjklzxcvbnm()[]{};\':,.<>€£$!&/?-_+=%@®™0123456789',
		ru : "ЙЦУКЕНГШЩЗХЪФЫВАПРОЛДЖЭЯЧСМИТЬБЮйцукенгшщзхъфывапролджэячсмитьбю()[]{};':,.<>€£$!&/?-_+=%@®™0123456789",
    }
	
	buildGlyphs = ['en', 'ru'];
	
	constructor(){
		
	}
	
	minifyFont(bufferData, newFontFamily){
		return new Promise((resolve, reject) => {
			try {
				const arrayBuffer = bufferData.buffer.slice(bufferData.byteOffset, bufferData.byteOffset + bufferData.byteLength);
				const font = opentype.parse(arrayBuffer);
				const glyphString = this.getGlyphString();
				const requiredGlyphs = [];

				for (const char of glyphString) {
					const glyph = font.charToGlyph(char);
					if (glyph && !requiredGlyphs.includes(glyph)) {
						requiredGlyphs.push(glyph);
					}
				}

				const spaceGlyph = font.charToGlyph(' ');
				
				if (spaceGlyph && !requiredGlyphs.includes(spaceGlyph)) {
					requiredGlyphs.push( spaceGlyph );
				}

				const minifiedFont = new opentype.Font({
					familyName	: newFontFamily,
					styleName	: 'Regular',
					unitsPerEm	: font.unitsPerEm,
					ascender	: font.ascender,
					descender	: font.descender,
					glyphs		: requiredGlyphs,
				});

				const newArrayBuffer = minifiedFont.toArrayBuffer();
				const newBuffer = Buffer.from(newArrayBuffer);
				
				resolve([{ ttfObject: minifiedFont, contents: newBuffer }]);
				
			}catch(err){
				
				reject("Ошибка при создании подмножества шрифта: " + err);
				
			}
		});
	}

	getGlyphString(){
        let glyphString = '';
        
		for (let i = 0; i < this.buildGlyphs.length; i++) {
            glyphString += this.glyphs[ this.buildGlyphs[i] ];
        }
		
        return glyphString;
    }
}