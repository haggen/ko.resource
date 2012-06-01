all: ko.resource.js
	@curl -s -d output_info=compiled_code --data-urlencode "js_code@ko.resource.js" http://closure-compiler.appspot.com/compile > ko.resource.min.js