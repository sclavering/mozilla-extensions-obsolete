var linkToolbarLinkFinder = {
  // regular expressions for identifying link types
  // XXX some pages use << for first and < for prev, so we should handle things like that differently
  re_first: /^first\b|\bfirst$|^begin|\|<|\u00ab/i, // ? >\u007c| ?
  re_prev:  /^prev(?:ious)?\b|prev$|previous$|^back\b|\bback$|^<<?-?\s?$|\u00ab/i, // \u003c / = | <=
  re_next:  /^next\b|\bcontinue\b|next$|^\s?-?>?>$/i, // |\u00bb$/i,
  re_last:  /^last\b|\blast$|^end\b|>\|/i, // ? >\u007c| ?

  // regular expressions used for identifying links based on the src url of contained images
  img_re_first: /first/i,
  img_re_prev:  /rev(?!iew)/i, // match [p]revious, but not [p]review
  img_re_next:  /ne?xt|fwd|forward/i,
  img_re_last:  /last/i,

  guessPrevAndNextFromURL: function(doc, guessPrev, guessNext) {
    if(!guessPrev && !guessNext) return;

    function isDigit(c) { return ("0" <= c && c <= "9") }

    const location = doc.location;
    var url = location.href;
    var min = location.host.length + location.protocol.length + 2; // 2 for "//"

    var e, s;
    for(e = url.length; e > min && !isDigit(url[e-1]); --e);
    if(e==min) return;
    for(s = e - 1; s > min && isDigit(url[s-1]); --s);

    var old = url.substring(s,e);
    var num = parseInt(old, 10); // force base 10 because number could start with zeros

    var pre = url.substring(0,s), post = url.substring(e);
    if(guessPrev) {
      var prv = ""+(num-1);
      while(prv.length < old.length) prv = "0" + prv;
      linkToolbarAddLinkForPage(new LTLinkInfo(pre + prv + post), doc, { prev: true });
    }
    if(guessNext) {
      var nxt = ""+(num+1);
      while(nxt.length < old.length) nxt = "0" + nxt;
      linkToolbarAddLinkForPage(new LTLinkInfo(pre + nxt + post), doc, { next: true });
    }
  },

  scanPageLinks: function(doc, links) {
    // The user has to wait for linkToolbarLinkFinder to finish before they can interact with the page
    // that has just loaded.  On pages with lots of links linkToolbarLinkFinder could make Firefox
    // unresponsive for several seconds if we didn't cap the number of links we inspect.
    // xxx think more about what cap to use (500 is probably excessively high)
    var max = Math.min(doc.links.length, 500);

    for(var i = 0; i != max; i++) {
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
        linkToolbarAddLinkForPage(info, doc, rels);
        continue; // no point using the regexps
      }

      if(this.re_next.test(title)) rels.next = true;
      else if(this.re_prev.test(title)) rels.prev = true;
      else if(this.re_first.test(title)) rels.first = true;
      else if(this.re_last.test(title)) rels.last = true;

      linkToolbarAddLinkForPage(new LTLinkInfo(href, title), doc, rels);
    }
  },

  // get the text contained in a link, and any guesses for rel based on img url
  getTextAndImgRels: function(el, rels) {
    var s = "";
    var node = el, lastNode = el.nextSibling;
    while(node && node!=lastNode) {
      var t = null;
      if(node.nodeType==3 || node.nodeType==2) {
        t = node.nodeValue; // CDATA and Text nodes
      } else if(node instanceof HTMLImageElement) {
        t = node.alt;
        // guess rel values from the URL. .src always gives an absolute URL, so we use getAttribute
        var src = node.getAttribute("src");
        if(this.img_re_next.test(src)) rels.next = true;
        else if(this.img_re_prev.test(src)) rels.prev = true;
        else if(this.img_re_first.test(src)) rels.first = true;
        else if(this.img_re_last.test(src)) rels.last = true;
      } else if(node instanceof HTMLAreaElement) {
        t = node.alt;
      }

      if(t) s = s ? s+" "+t : t; // the space *is* important.  some sites (ebay) don't put a space btwn. text and images

      var next = node.firstChild || node.nextSibling;
      while(!next && node!=el) node = node.parentNode, next = node.nextSibling;
      node = next;
    }

    return s;
  }
}
