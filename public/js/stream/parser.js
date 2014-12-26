/*
Parser object
- text = string to be parsed
*/
function Parser(text) {
    this.text = text;
    this.position = 0;
}
 
/*
Parse the text according to the given markup rules.
- rules is an array of markup rules in the form [start_tag, handler] where
    start_tag
      is a regular expression for the start tag
    handler(match_result, output) [with this = the Parser object]
      advances the parser past the body and end tag (if any)
      creates the DOM nodes that the tag represents
      and appends them to output (an array to be passed to jQuery's .append() function)
- end_tag (optional) is a regular expression which causes parsing to stop
*/
Parser.prototype.parse = function(rules) {
    var output = "";
    do {
        var match = null;
        var match_pos = this.text.length;
        var handler = null;
        for (var i = 0; i < rules.length; i++) {
            rules[i][0].lastIndex = this.position;
            var result = rules[i][0].exec(this.text);
            if (result !== null && this.position <= result.index && result.index < match_pos) {
                match = result;
                match_pos = result.index;
                handler = rules[i][1];
            }
        }
        var unmatched_text = this.text.substring(this.position, match_pos);
        output += unmatched_text;
        this.position = match_pos;
        if (match !== null) {
            console.log(match[0]);
            this.position += match[0].length;
            output += handler.call(this, match);
        }
    } while (match !== null);
    return output;
}
 
/* Advances past end_tag and returns the unparsed body */
Parser.prototype.no_parse = function(end_tag) {
    return $(this.parse([], end_tag)[0]).text();
}

