const linkFinder = {
  findLinks: function(doc) {
    if(!("__lt__links" in doc)) doc.__lt__links = new Array();

    // add 'up' and 'top' links if we don't already have them
    var noTop = true, noUp = true;
    for(var i = 0; (noTop || noUp) && i < doc.__lt__links.length; i++) {
      var link = doc.__lt__links[i];
      if("top" in link.relValues) noTop = false;
      if("up" in link.relValues) noUp = false;
    }
    if(noTop) {
      var topurl = doc.location.href.match(/^[^\/]*?:\/\/[^\/]*\//);
      if(topurl) {
        topurl = topurl[0];
        var toprels = [];
        toprels["top"] = "top";
        var top = {href: topurl, relValues: toprels, title: null, longTitle: null};
        linkToolbarUI.addLink(top, doc);
      }
    }
    if(noUp) {
      var upurl = this.getUp(doc.location.href);
      if(upurl) {
        var uprels = [];
        uprels["up"] = "up";
        var up = {href: upurl, relValues: uprels, title: null, longTitle: null};
        linkToolbarUI.addLink(up, doc);
      }
    }
  },

  // borrowed from GoUp
  // xxx: do something like !/(index|main)\.(html?|php3?)/i.test(matches[2])
  // to choose btwn up==. or up==..
  getUp: function(url) {
    var matches, origUrl = url;
    // trim filename (this makes subdriectory digging easier)
    matches = url.match(/(^.*\/)(.*)/);
    if(!matches) return null; //only fails if "url" has no /'s
    url = matches[1];
    if(url!=origUrl && !/(index|main)\.(php3?|html?)/i.test(url))
      return url;
    // dig through subdirs
    matches = url.match(/^([^\/]*?:\/\/.*\/)[^\/]+?\//);
    if(matches) return matches[1];
    // we've reach (ht|f)tp://foo.com/, climb up through subdomains
    // split into protocol and domain
    matches = url.match(/([^:]*:\/\/)?(.*)/);
    var protocol = matches[1], domain = matches[2];
    matches = domain.match(/^[^\.]*\.(.*)/);
    if(matches) return (protocol+matches[1]);
    // nothing found
    return null;
  }
}
