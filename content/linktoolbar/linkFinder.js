var linkFinder = {
  // regular expressions for identifying link types
  // XXX some pages use << for first and < for prev, so we should handle things like that differently
  re_first: /^first\b|\bfirst$|^begin|\|<|\u00ab/i, // ? >\u007c| ?
  re_prev:  /^prev(ious)?\b|prev$|previous$|^back\b|\bback$|^<<?-?$|\u00ab/i, // \u003c / = | <=
  re_next:  /^next\b|\bcontinue\b|next$|^-?>?>$|\u00bb$/i,
  re_last:  /^last\b|\blast$|^end\b|>\|/i, // ? >\u007c| ?

  // regular expressions used for identifying links based on the src url of contained images
  img_re_first: /first/i,
  img_re_prev:  /rev/i, // was /p?rev/
  img_re_next:  /ne?xt|more|fwd/i,
  img_re_last:  /last/i,


  guessUpAndTopFromURL: function(doc, doclinks, url) {
    if(!("top" in doclinks)) {
      var topurl = url.match(/^[^\/]*?:\/\/[^\/]*\//);
      if(topurl) this.addLink(doc, topurl[0], "top", null, null);
    }
    if(!("up" in doclinks)) {
      var upurl = this.getUp(url);
      if(upurl) this.addLink(doc, upurl, "up", null, null);
    }
  },


  guessPrevAndNextFromURL: function(doc, doclinks, url) {
    var addPrev = !("prev" in doclinks);
    var addNext = !("next" in doclinks);
    if(!addPrev && !addNext) return;

    function isDigit(c) { return ("0" <= c && c <= "9") }

    var e,s;
    for(e = url.length; e > 0 && !isDigit(url[e-1]); --e);
    if(e==0) return;
    for(s = e - 1; s > 0 && isDigit(url[s-1]); --s);

    var old = url.substring(s,e);
    var num = parseInt(old, 10); // force base 10 because number could start with zeros

    var pre = url.substring(0,s), post = url.substring(e);
    if(addPrev) {
      var prv = ""+(num-1);
      while(prv.length < old.length) prv = "0" + prv;
      this.addLink(doc, pre+prv+post, "prev", null, null);
    }
    if(addNext) {
      var nxt = ""+(num+1);
      while(nxt.length < old.length) nxt = "0" + nxt;
      this.addLink(doc, pre+nxt+post, "next", null, null);
    }
  },


  scanPageLinks: function(doc, links) {
    // The user has to wait for linkFinder to finish before they can interact with the page
    // that has just loaded.  On pages with lots of links linkFinder could make Firefox
    // unresponsive for several seconds if we didn't cap the number of links we inspect.
    // xxx think more about what cap to use (500 is probably excessively high)
    var max = Math.min(doc.links.length, 500);

    for(i = 0; i != max; i++) {
      var link = doc.links[i];
      var href = link.href;

      // ignore internal links
      if(!href || href.charAt(0)=='#') continue;

      var rels = [];
      var title = this.getTextAndImgRels(link, rels);
      title = title.replace(/\s+/g," ");

      if(link.rel || link.rev) {
        rels = linkToolbarUtils.getLinkRels(link.rel, link.rev);
        var info = new LTLinkInfo(link.href, title, link.hreflang, null);
        linkToolbarUI.addLink(info, doc, rels);
        continue; // no point using the regexps
      }

      if(this.re_next.test(title)) rels["next"] = true;
      else if(this.re_prev.test(title)) rels["prev"] = true;
      else if(this.re_first.test(title)) rels["first"] = true;
      else if(this.re_last.test(title)) rels["last"] = true;

      for(var rel in rels) this.addLink(doc, href, rel, title, title);
    }
  },


  addLink: function(doc, url, rel, title, longTitle) {
    var rels = [];
    rels[rel] = true;
    var info = {href: url, title: title, longTitle: longTitle};
    linkToolbarUI.addLink(info, doc, rels);
  },


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
    if(el instanceof HTMLImageElement) {
      // should this have spaces wrapped round it?
      s = el.alt;
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
    for(var i = 0; i != kids.length; i++) {
      var kid = kids[i];
      // add contents of CDATA or text nodes
      if(kid.nodeType==3 || kid.nodeType==2) s += kid.nodeValue;
      // call recursively for elements
      else if(kid.nodeType==1) s += this.getTextAndImgRels(kid, rels);
    }
    return s;
  }
}
