const linkFinder = {
  // regular expressions for identifying link types
  // XXX some pages use << for first and < for prev, so we should handle things like that differently
  re_first: /^first\b|\bfirst$|^begin|\|<|\u00ab/i, // ? >\u007c| ?
  re_prev:  /^prev(ious)?\b|prev$|previous$|^back\b|\bback$|^<<?-?$|\u00ab/i, // \u003c / = | <=
  re_next:  /^next\b|^more\b|continue\b|next$|^-?>?>$|\u00bb/i,
  re_last:  /^last|last$|^end\b|>\|/i, // ? >\u007c| ?

  // regular expressions used for identifying links based on the src url of contained images
  re_first2: /first/i,
  re_prev2:  /p?rev/i,
  re_next2:  /next|more|fwd/i,
  re_last2:  /last/i,

  findLinks: function(doc) {
    var i, j, link;

    if(!("__lt__links" in doc)) doc.__lt__links = new Array();

    // work out which reltypes to generate links for
    var noTop = true, noUp = true, noPrev = true, noNext = true;
    for(i = 0; (noTop || noUp || noPrev || noNext) && i < doc.__lt__links.length; i++) {
      link = doc.__lt__links[i];
      if("top" in link.relValues) noTop = false;
      if("up" in link.relValues) noUp = false;
      if("prev" in link.relValues) noPrev = false;
      if("next" in link.relValues) noNext = false;
    }

    // generate top and up links based on url
    if(noTop) {
      var topurl = doc.location.href.match(/^[^\/]*?:\/\/[^\/]*\//);
      if(topurl) this.addLink(doc, topurl[0], null, "top", null, null, null);
    }
    if(noUp) {
      var upurl = this.getUp(doc.location.href);
      if(upurl) this.addLink(doc, upurl, null, "up", null, null, null);
    }

    // generate other links based on <a href="..."/> style links

    if(!(noPrev || noNext)) return;


    var addedLinks = [];

    for(i = 0; i < doc.links.length; i++) {
      link = doc.links[i];
      var href = link.getAttribute("href");
      var rel = link.getAttribute("rel");
      var base = link.baseURI; // DOM3, needed because we have to resolve relative urls

      // ignore non link <a>s, and internal links
      if(!href || href.charAt(0)=='#') continue;

      var title = this.getText(link).replace(/\s+/g," ");

      // Do The Right Thing for <a href="..." rel="..."/>  :)
      if(rel) {
        // get rel types
        var rawRels = rel.split(/\s+/);
        var rels = [];
        for(j = 0; j < rawRels.length; j++) {
          var aRel = linkToolbarHandler.standardiseRelType(rawRels[j]);
          // avoid duplicate rel values
          if(aRel) rels[aRel] = aRel;
        }
        if(rels.length==0) continue;
        // add the link
        var info = {href: href, relValues: rels, title: title, longTitle: null};
        linkToolbarUI.addLink(info, doc);
        // don't bother with hackery below
        continue;
      }

      if(this.re_next.test(title))
        this.addLink(doc, href, base, "next", title, null, addedLinks);
      else if(this.re_prev.test(title))
        this.addLink(doc, href, base, "prev", title, null, addedLinks);
      else if(this.re_first.test(title))
        this.addLink(doc, href, base, "first", title, null, addedLinks);
      else if(this.re_last.test(title))
        this.addLink(doc, href, base, "last", title, null, addedLinks);
    }
  },

  addLink: function(doc, url, base, rel, title, longTitle, addedLinks) {
  	// resolve relative urls
  	if(base) {
    	var baseuri = Components.classes["@mozilla.org/network/standard-url;1"]//.createInstance();
    	                        .createInstance(Components.interfaces.nsIURI);
    	baseuri.spec = base;
    	url = baseuri.resolve(url);
    }
    // avoid duplicate links
    if(addedLinks) {
      if(rel in addedLinks) {
        if(url in addedLinks[rel]) return; // it's a dup.
        addedLinks[rel][url] = true;
      } else {
        addedLinks[rel] = [];
        addedLinks[rel][url] = true;
      }
    }
    // add the link
    var rels = [];
    rels[rel] = rel;
    var info = {href: url, relValues: rels, title: title, longTitle: longTitle};
    linkToolbarUI.addLink(info, doc);
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
  },

  // get the text contained in a link
  // XXX rewrite this to be less horrible
  getText: function(el) {
    // use alt text for images
    if(el.nodeName.toLowerCase() == "img") {
      // should this have spaces wrapped round it?
      s = el.getAttribute("alt");
      // hacky test of image src url because authors don't use alt :(
      var src = el.getAttribute("src");
      if(this.re_next2.test(src)) s += " next";
      else if(this.re_prev2.test(src)) s += " prev";
      else if(this.re_first2.test(src)) s += " first";
      else if(this.re_last2.test(src)) s += " last";
      return s;
    }
    // deal with other elements
    var s = "", kids = el.childNodes;
    for(var i = 0; i < kids.length; i++) {
      // add contents of CDATA or text nodes
      if(kids[i].nodeType==3 || kids[i].nodeType==2) s += kids[i].nodeValue;
      // call recursively for elements
      else if(kids[i].nodeType==1) s += this.getText(kids[i]);
    }
    return s;
  }
}
