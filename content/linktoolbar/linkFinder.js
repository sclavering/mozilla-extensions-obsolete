const linkFinder = {
  // regular expressions for identifying link types
  // XXX some pages use << for first and < for prev, so we should handle things like that differently
  re_first: /^first\b|\bfirst$|^begin|\|<|\u00ab/i, // ? >\u007c| ?
  re_prev:  /^prev(ious)?\b|prev$|previous$|^back\b|\bback$|^<<?-?$|\u00ab/i, // \u003c / = | <=
  re_next:  /^next\b|\bcontinue\b|next$|^-?>?>$|\u00bb$/i,
  re_last:  /^last\b|\blast$|^end\b|>\|/i, // ? >\u007c| ?

  // regular expressions used for identifying links based on the src url of contained images
  img_re_first: /first/i,
  img_re_prev:  /p?rev/i,
  img_re_next:  /next|more|fwd/i,
  img_re_last:  /last/i,

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
      if(topurl) this.addLink(doc, topurl[0], "top", null, null, null);
    }
    if(noUp) {
      var upurl = this.getUp(doc.location.href);
      if(upurl) this.addLink(doc, upurl, "up", null, null, null);
    }

    // generate other links based on <a href="..."/> style links

    if(!noUp || !noTop || !noPrev || !noNext) return;

    var addedLinks = [];

    // The user has to wait for linkFinder to finish before they can interact with the page
    // that has just loaded.  On pages with lots of links linkFinder could make Firefox
    // unresponsive for several seconds if we didn't cap the number of links we inspect.
    // xxx think more about what cap to use (500 is probably excessively high)
    var max = Math.min(doc.links.length, 500);

    for(i = 0; i < max; i++) {
      link = doc.links[i];
      var href = link.href;
      var rel = link.rel;

      // ignore non link <a>s, and internal links
      if(!href || href.charAt(0)=='#') continue;

      var rels = [];
      var title = this.getTextAndImgRels(link, rels);
      title = title.replace(/\s+/g," ");

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

      if(this.re_next.test(title)) rels["next"] = true;
      else if(this.re_prev.test(title)) rels["prev"] = true;
      else if(this.re_first.test(title)) rels["first"] = true;
      else if(this.re_last.test(title)) rels["last"] = true;

      for(var rell in rels) this.addLink(doc, href, rell, title, title, addedLinks);
    }
  },

  addLink: function(doc, url, rel, title, longTitle, addedLinks) {
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

  // get the text contained in a link, and any guesses for rel based on img url
  getTextAndImgRels: function(el, rels) {
    var s = "";
    // use alt text for images
    if(el instanceof Components.interfaces.nsIDOMHTMLImageElement ) {
      // should this have spaces wrapped round it?
      s = el.getAttribute("alt");
      if(s) return s;

      // guess some rel values from the url.
      // (examining alt text is usually better, but this image has no alt text)
      var src = el.getAttribute("src");
      if(this.img_re_next.test(src)) rels["next"] = true;
      else if(this.img_re_prev.test(src)) rels["prev"] = true;
      else if(this.img_re_first.test(src)) rels["first"] = true;
      else if(this.img_re_last.test(src)) rels["last"] = true;
      return s;
    }
    // deal with other elements
    var kids = el.childNodes;
    for(var i = 0; i < kids.length; i++) {
      var kid = kids[i];
      // add contents of CDATA or text nodes
      if(kid.nodeType==3 || kid.nodeType==2) s += kid.nodeValue;
      // call recursively for elements
      else if(kid.nodeType==1) s += this.getTextAndImgRels(kid, rels);
    }
    return s;
  }
}
