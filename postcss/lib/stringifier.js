"use strict";

exports.__esModule = true;
exports.default = void 0;
var DEFAULT_RAW = {
  colon: ': ',
  indent: '    ',
  beforeDecl: '\n',
  beforeRule: '\n',
  beforeOpen: ' ',
  beforeClose: '\n',
  beforeComment: '\n',
  after: '\n',
  emptyBody: '',
  commentLeft: ' ',
  commentRight: ' ',
  semicolon: false
};

function capitalize(str) {
  return str[0].toUpperCase() + str.slice(1);
}

var Stringifier = /*#__PURE__*/function () {
  function Stringifier(builder) {
    this.builder = builder;
  }

  var _proto = Stringifier.prototype;

  _proto.stringify = function stringify(node, semicolon) {
    this[node.type](node, semicolon);
  };

  _proto.root = function root(node) {
    this.body(node);
    if (node.raws.after) this.builder(node.raws.after);
  };

  _proto.comment = function comment(node) {
    var left = this.raw(node, 'left', 'commentLeft');
    var right = this.raw(node, 'right', 'commentRight');
    this.builder('/*' + left + node.text + right + '*/', node);
  };

  _proto.decl = function decl(node, semicolon) {
    var between = this.raw(node, 'between', 'colon');
    var string = node.prop + between + this.rawValue(node, 'value');

    if (node.important) {
      string += node.raws.important || ' !important';
    }

    if (semicolon) string += ';';
    this.builder(string, node);
  };

  _proto.rule = function rule(node) {
    this.block(node, this.rawValue(node, 'selector'));

    if (node.raws.ownSemicolon) {
      this.builder(node.raws.ownSemicolon, node, 'end');
    }
  };

  _proto.atrule = function atrule(node, semicolon) {
    var name = '@' + node.name;
    var params = node.params ? this.rawValue(node, 'params') : '';

    if (typeof node.raws.afterName !== 'undefined') {
      name += node.raws.afterName;
    } else if (params) {
      name += ' ';
    }

    if (node.nodes) {
      this.block(node, name + params);
    } else {
      var end = (node.raws.between || '') + (semicolon ? ';' : '');
      this.builder(name + params + end, node);
    }
  };

  _proto.body = function body(node) {
    var last = node.nodes.length - 1;

    while (last > 0) {
      if (node.nodes[last].type !== 'comment') break;
      last -= 1;
    }

    var semicolon = this.raw(node, 'semicolon');

    for (var i = 0; i < node.nodes.length; i++) {
      var child = node.nodes[i];
      var before = this.raw(child, 'before');
      if (before) this.builder(before);
      this.stringify(child, last !== i || semicolon);
    }
  };

  _proto.block = function block(node, start) {
    var between = this.raw(node, 'between', 'beforeOpen');
    this.builder(start + between + '{', node, 'start');
    var after;

    if (node.nodes && node.nodes.length) {
      this.body(node);
      after = this.raw(node, 'after');
    } else {
      after = this.raw(node, 'after', 'emptyBody');
    }

    if (after) this.builder(after);
    this.builder('}', node, 'end');
  };

  _proto.raw = function raw(node, own, detect) {
    var value;
    if (!detect) detect = own; // Already had

    if (own) {
      value = node.raws[own];
      if (typeof value !== 'undefined') return value;
    }

    var parent = node.parent; // Hack for first rule in CSS

    if (detect === 'before') {
      if (!parent || parent.type === 'root' && parent.first === node) {
        return '';
      }
    } // Floating child without parent


    if (!parent) return DEFAULT_RAW[detect]; // Detect style by other nodes

    var root = node.root();
    if (!root.rawCache) root.rawCache = {};

    if (typeof root.rawCache[detect] !== 'undefined') {
      return root.rawCache[detect];
    }

    if (detect === 'before' || detect === 'after') {
      return this.beforeAfter(node, detect);
    } else {
      var method = 'raw' + capitalize(detect);

      if (this[method]) {
        value = this[method](root, node);
      } else {
        root.walk(function (i) {
          value = i.raws[own];
          if (typeof value !== 'undefined') return false;
        });
      }
    }

    if (typeof value === 'undefined') value = DEFAULT_RAW[detect];
    root.rawCache[detect] = value;
    return value;
  };

  _proto.rawSemicolon = function rawSemicolon(root) {
    var value;
    root.walk(function (i) {
      if (i.nodes && i.nodes.length && i.last.type === 'decl') {
        value = i.raws.semicolon;
        if (typeof value !== 'undefined') return false;
      }
    });
    return value;
  };

  _proto.rawEmptyBody = function rawEmptyBody(root) {
    var value;
    root.walk(function (i) {
      if (i.nodes && i.nodes.length === 0) {
        value = i.raws.after;
        if (typeof value !== 'undefined') return false;
      }
    });
    return value;
  };

  _proto.rawIndent = function rawIndent(root) {
    if (root.raws.indent) return root.raws.indent;
    var value;
    root.walk(function (i) {
      var p = i.parent;

      if (p && p !== root && p.parent && p.parent === root) {
        if (typeof i.raws.before !== 'undefined') {
          var parts = i.raws.before.split('\n');
          value = parts[parts.length - 1];
          value = value.replace(/[^\s]/g, '');
          return false;
        }
      }
    });
    return value;
  };

  _proto.rawBeforeComment = function rawBeforeComment(root, node) {
    var value;
    root.walkComments(function (i) {
      if (typeof i.raws.before !== 'undefined') {
        value = i.raws.before;

        if (value.indexOf('\n') !== -1) {
          value = value.replace(/[^\n]+$/, '');
        }

        return false;
      }
    });

    if (typeof value === 'undefined') {
      value = this.raw(node, null, 'beforeDecl');
    } else if (value) {
      value = value.replace(/[^\s]/g, '');
    }

    return value;
  };

  _proto.rawBeforeDecl = function rawBeforeDecl(root, node) {
    var value;
    root.walkDecls(function (i) {
      if (typeof i.raws.before !== 'undefined') {
        value = i.raws.before;

        if (value.indexOf('\n') !== -1) {
          value = value.replace(/[^\n]+$/, '');
        }

        return false;
      }
    });

    if (typeof value === 'undefined') {
      value = this.raw(node, null, 'beforeRule');
    } else if (value) {
      value = value.replace(/[^\s]/g, '');
    }

    return value;
  };

  _proto.rawBeforeRule = function rawBeforeRule(root) {
    var value;
    root.walk(function (i) {
      if (i.nodes && (i.parent !== root || root.first !== i)) {
        if (typeof i.raws.before !== 'undefined') {
          value = i.raws.before;

          if (value.indexOf('\n') !== -1) {
            value = value.replace(/[^\n]+$/, '');
          }

          return false;
        }
      }
    });
    if (value) value = value.replace(/[^\s]/g, '');
    return value;
  };

  _proto.rawBeforeClose = function rawBeforeClose(root) {
    var value;
    root.walk(function (i) {
      if (i.nodes && i.nodes.length > 0) {
        if (typeof i.raws.after !== 'undefined') {
          value = i.raws.after;

          if (value.indexOf('\n') !== -1) {
            value = value.replace(/[^\n]+$/, '');
          }

          return false;
        }
      }
    });
    if (value) value = value.replace(/[^\s]/g, '');
    return value;
  };

  _proto.rawBeforeOpen = function rawBeforeOpen(root) {
    var value;
    root.walk(function (i) {
      if (i.type !== 'decl') {
        value = i.raws.between;
        if (typeof value !== 'undefined') return false;
      }
    });
    return value;
  };

  _proto.rawColon = function rawColon(root) {
    var value;
    root.walkDecls(function (i) {
      if (typeof i.raws.between !== 'undefined') {
        value = i.raws.between.replace(/[^\s:]/g, '');
        return false;
      }
    });
    return value;
  };

  _proto.beforeAfter = function beforeAfter(node, detect) {
    var value;

    if (node.type === 'decl') {
      value = this.raw(node, null, 'beforeDecl');
    } else if (node.type === 'comment') {
      value = this.raw(node, null, 'beforeComment');
    } else if (detect === 'before') {
      value = this.raw(node, null, 'beforeRule');
    } else {
      value = this.raw(node, null, 'beforeClose');
    }

    var buf = node.parent;
    var depth = 0;

    while (buf && buf.type !== 'root') {
      depth += 1;
      buf = buf.parent;
    }

    if (value.indexOf('\n') !== -1) {
      var indent = this.raw(node, null, 'indent');

      if (indent.length) {
        for (var step = 0; step < depth; step++) {
          value += indent;
        }
      }
    }

    return value;
  };

  _proto.rawValue = function rawValue(node, prop) {
    var value = node[prop];
    var raw = node.raws[prop];

    if (raw && raw.value === value) {
      return raw.raw;
    }

    return value;
  };

  return Stringifier;
}();

var _default = Stringifier;
exports.default = _default;
module.exports = exports.default;
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInN0cmluZ2lmaWVyLmVzNiJdLCJuYW1lcyI6WyJERUZBVUxUX1JBVyIsImNvbG9uIiwiaW5kZW50IiwiYmVmb3JlRGVjbCIsImJlZm9yZVJ1bGUiLCJiZWZvcmVPcGVuIiwiYmVmb3JlQ2xvc2UiLCJiZWZvcmVDb21tZW50IiwiYWZ0ZXIiLCJlbXB0eUJvZHkiLCJjb21tZW50TGVmdCIsImNvbW1lbnRSaWdodCIsInNlbWljb2xvbiIsImNhcGl0YWxpemUiLCJzdHIiLCJ0b1VwcGVyQ2FzZSIsInNsaWNlIiwiU3RyaW5naWZpZXIiLCJidWlsZGVyIiwic3RyaW5naWZ5Iiwibm9kZSIsInR5cGUiLCJyb290IiwiYm9keSIsInJhd3MiLCJjb21tZW50IiwibGVmdCIsInJhdyIsInJpZ2h0IiwidGV4dCIsImRlY2wiLCJiZXR3ZWVuIiwic3RyaW5nIiwicHJvcCIsInJhd1ZhbHVlIiwiaW1wb3J0YW50IiwicnVsZSIsImJsb2NrIiwib3duU2VtaWNvbG9uIiwiYXRydWxlIiwibmFtZSIsInBhcmFtcyIsImFmdGVyTmFtZSIsIm5vZGVzIiwiZW5kIiwibGFzdCIsImxlbmd0aCIsImkiLCJjaGlsZCIsImJlZm9yZSIsInN0YXJ0Iiwib3duIiwiZGV0ZWN0IiwidmFsdWUiLCJwYXJlbnQiLCJmaXJzdCIsInJhd0NhY2hlIiwiYmVmb3JlQWZ0ZXIiLCJtZXRob2QiLCJ3YWxrIiwicmF3U2VtaWNvbG9uIiwicmF3RW1wdHlCb2R5IiwicmF3SW5kZW50IiwicCIsInBhcnRzIiwic3BsaXQiLCJyZXBsYWNlIiwicmF3QmVmb3JlQ29tbWVudCIsIndhbGtDb21tZW50cyIsImluZGV4T2YiLCJyYXdCZWZvcmVEZWNsIiwid2Fsa0RlY2xzIiwicmF3QmVmb3JlUnVsZSIsInJhd0JlZm9yZUNsb3NlIiwicmF3QmVmb3JlT3BlbiIsInJhd0NvbG9uIiwiYnVmIiwiZGVwdGgiLCJzdGVwIl0sIm1hcHBpbmdzIjoiOzs7O0FBQUEsSUFBTUEsV0FBVyxHQUFHO0FBQ2xCQyxFQUFB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QUFDRDs7QUFFRCxRQUFJd0QsR0FBRyxHQUFHeEQsSUFBSSxDQUFDa0MsTUFBZjtBQUNBLFFBQUl1QixLQUFLLEdBQUcsQ0FBWjs7QUFDQSxXQUFPRCxHQUFHLElBQUlBLEdBQUcsQ0FBQ3ZELElBQUosS0FBYSxNQUEzQixFQUFtQztBQUNqQ3dELE1BQUFBLEtBQUssSUFBSSxDQUFUO0FBQ0FELE1BQUFBLEdBQUcsR0FBR0EsR0FBRyxDQUFDdEIsTUFBVjtBQUNEOztBQUVELFFBQUlELEtBQUssQ0FBQ2dCLE9BQU4sQ0FBYyxJQUFkLE1BQXdCLENBQUMsQ0FBN0IsRUFBZ0M7QUFDOUIsVUFBSW5FLE1BQU0sR0FBRyxLQUFLeUIsR0FBTCxDQUFTUCxJQUFULEVBQWUsSUFBZixFQUFxQixRQUFyQixDQUFiOztBQUNBLFVBQUlsQixNQUFNLENBQUM0QyxNQUFYLEVBQW1CO0FBQ2pCLGFBQUssSUFBSWdDLElBQUksR0FBRyxDQUFoQixFQUFtQkEsSUFBSSxHQUFHRCxLQUExQixFQUFpQ0MsSUFBSSxFQUFyQztBQUF5Q3pCLFVBQUFBLEtBQUssSUFBSW5ELE1BQVQ7QUFBekM7QUFDRDtBQUNGOztBQUVELFdBQU9tRCxLQUFQO0FBQ0QsRzs7U0FFRG5CLFEsR0FBQSxrQkFBVWQsSUFBVixFQUFnQmEsSUFBaEIsRUFBc0I7QUFDcEIsUUFBSW9CLEtBQUssR0FBR2pDLElBQUksQ0FBQ2EsSUFBRCxDQUFoQjtBQUNBLFFBQUlOLEdBQUcsR0FBR1AsSUFBSSxDQUFDSSxJQUFMLENBQVVTLElBQVYsQ0FBVjs7QUFDQSxRQUFJTixHQUFHLElBQUlBLEdBQUcsQ0FBQzBCLEtBQUosS0FBY0EsS0FBekIsRUFBZ0M7QUFDOUIsYUFBTzFCLEdBQUcsQ0FBQ0EsR0FBWDtBQUNEOztBQUVELFdBQU8wQixLQUFQO0FBQ0QsRzs7Ozs7ZUFHWXBDLFciLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCBERUZBVUxUX1JBVyA9IHtcbiAgY29sb246ICc6ICcsXG4gIGluZGVudDogJyAgICAnLFxuICBiZWZvcmVEZWNsOiAnXFxuJyxcbiAgYmVmb3JlUnVsZTogJ1xcbicsXG4gIGJlZm9yZU9wZW46ICcgJyxcbiAgYmVmb3JlQ2xvc2U6ICdcXG4nLFxuICBiZWZvcmVDb21tZW50OiAnXFxuJyxcbiAgYWZ0ZXI6ICdcXG4nLFxuICBlbXB0eUJvZHk6ICcnLFxuICBjb21tZW50TGVmdDogJyAnLFxuICBjb21tZW50UmlnaHQ6ICcgJyxcbiAgc2VtaWNvbG9uOiBmYWxzZVxufVxuXG5mdW5jdGlvbiBjYXBpdGFsaXplIChzdHIpIHtcbiAgcmV0dXJuIHN0clswXS50b1VwcGVyQ2FzZSgpICsgc3RyLnNsaWNlKDEpXG59XG5cbmNsYXNzIFN0cmluZ2lmaWVyIHtcbiAgY29uc3RydWN0b3IgKGJ1aWxkZXIpIHtcbiAgICB0aGlzLmJ1aWxkZXIgPSBidWlsZGVyXG4gIH1cblxuICBzdHJpbmdpZnkgKG5vZGUsIHNlbWljb2xvbikge1xuICAgIHRoaXNbbm9kZS50eXBlXShub2RlLCBzZW1pY29sb24pXG4gIH1cblxuICByb290IChub2RlKSB7XG4gICAgdGhpcy5ib2R5KG5vZGUpXG4gICAgaWYgKG5vZGUucmF3cy5hZnRlcikgdGhpcy5idWlsZGVyKG5vZGUucmF3cy5hZnRlcilcbiAgfVxuXG4gIGNvbW1lbnQgKG5vZGUpIHtcbiAgICBsZXQgbGVmdCA9IHRoaXMucmF3KG5vZGUsICdsZWZ0JywgJ2NvbW1lbnRMZWZ0JylcbiAgICBsZXQgcmlnaHQgPSB0aGlzLnJhdyhub2RlLCAncmlnaHQnLCAnY29tbWVudFJpZ2h0JylcbiAgICB0aGlzLmJ1aWxkZXIoJy8qJyArIGxlZnQgKyBub2RlLnRleHQgKyByaWdodCArICcqLycsIG5vZGUpXG4gIH1cblxuICBkZWNsIChub2RlLCBzZW1pY29sb24pIHtcbiAgICBsZXQgYmV0d2VlbiA9IHRoaXMucmF3KG5vZGUsICdiZXR3ZWVuJywgJ2NvbG9uJylcbiAgICBsZXQgc3RyaW5nID0gbm9kZS5wcm9wICsgYmV0d2VlbiArIHRoaXMucmF3VmFsdWUobm9kZSwgJ3ZhbHVlJylcblxuICAgIGlmIChub2RlLmltcG9ydGFudCkge1xuICAgICAgc3RyaW5nICs9IG5vZGUucmF3cy5pbXBvcnRhbnQgfHwgJyAhaW1wb3J0YW50J1xuICAgIH1cblxuICAgIGlmIChzZW1pY29sb24pIHN0cmluZyArPSAnOydcbiAgICB0aGlzLmJ1aWxkZXIoc3RyaW5nLCBub2RlKVxuICB9XG5cbiAgcnVsZSAobm9kZSkge1xuICAgIHRoaXMuYmxvY2sobm9kZSwgdGhpcy5yYXdWYWx1ZShub2RlLCAnc2VsZWN0b3InKSlcbiAgICBpZiAobm9kZS5yYXdzLm93blNlbWljb2xvbikge1xuICAgICAgdGhpcy5idWlsZGVyKG5vZGUucmF3cy5vd25TZW1pY29sb24sIG5vZGUsICdlbmQnKVxuICAgIH1cbiAgfVxuXG4gIGF0cnVsZSAobm9kZSwgc2VtaWNvbG9uKSB7XG4gICAgbGV0IG5hbWUgPSAnQCcgKyBub2RlLm5hbWVcbiAgICBsZXQgcGFyYW1zID0gbm9kZS5wYXJhbXMgPyB0aGlzLnJhd1ZhbHVlKG5vZGUsICdwYXJhbXMnKSA6ICcnXG5cbiAgICBpZiAodHlwZW9mIG5vZGUucmF3cy5hZnRlck5hbWUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBuYW1lICs9IG5vZGUucmF3cy5hZnRlck5hbWVcbiAgICB9IGVsc2UgaWYgKHBhcmFtcykge1xuICAgICAgbmFtZSArPSAnICdcbiAgICB9XG5cbiAgICBpZiAobm9kZS5ub2Rlcykge1xuICAgICAgdGhpcy5ibG9jayhub2RlLCBuYW1lICsgcGFyYW1zKVxuICAgIH0gZWxzZSB7XG4gICAgICBsZXQgZW5kID0gKG5vZGUucmF3cy5iZXR3ZWVuIHx8ICcnKSArIChzZW1pY29sb24gPyAnOycgOiAnJylcbiAgICAgIHRoaXMuYnVpbGRlcihuYW1lICsgcGFyYW1zICsgZW5kLCBub2RlKVxuICAgIH1cbiAgfVxuXG4gIGJvZHkgKG5vZGUpIHtcbiAgICBsZXQgbGFzdCA9IG5vZGUubm9kZXMubGVuZ3RoIC0gMVxuICAgIHdoaWxlIChsYXN0ID4gMCkge1xuICAgICAgaWYgKG5vZGUubm9kZXNbbGFzdF0udHlwZSAhPT0gJ2NvbW1lbnQnKSBicmVha1xuICAgICAgbGFzdCAtPSAxXG4gICAgfVxuXG4gICAgbGV0IHNlbWljb2xvbiA9IHRoaXMucmF3KG5vZGUsICdzZW1pY29sb24nKVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbm9kZS5ub2Rlcy5sZW5ndGg7IGkrKykge1xuICAgICAgbGV0IGNoaWxkID0gbm9kZS5ub2Rlc1tpXVxuICAgICAgbGV0IGJlZm9yZSA9IHRoaXMucmF3KGNoaWxkLCAnYmVmb3JlJylcbiAgICAgIGlmIChiZWZvcmUpIHRoaXMuYnVpbGRlcihiZWZvcmUpXG4gICAgICB0aGlzLnN0cmluZ2lmeShjaGlsZCwgbGFzdCAhPT0gaSB8fCBzZW1pY29sb24pXG4gICAgfVxuICB9XG5cbiAgYmxvY2sgKG5vZGUsIHN0YXJ0KSB7XG4gICAgbGV0IGJldHdlZW4gPSB0aGlzLnJhdyhub2RlLCAnYmV0d2VlbicsICdiZWZvcmVPcGVuJylcbiAgICB0aGlzLmJ1aWxkZXIoc3RhcnQgKyBiZXR3ZWVuICsgJ3snLCBub2RlLCAnc3RhcnQnKVxuXG4gICAgbGV0IGFmdGVyXG4gICAgaWYgKG5vZGUubm9kZXMgJiYgbm9kZS5ub2Rlcy5sZW5ndGgpIHtcbiAgICAgIHRoaXMuYm9keShub2RlKVxuICAgICAgYWZ0ZXIgPSB0aGlzLnJhdyhub2RlLCAnYWZ0ZXInKVxuICAgIH0gZWxzZSB7XG4gICAgICBhZnRlciA9IHRoaXMucmF3KG5vZGUsICdhZnRlcicsICdlbXB0eUJvZHknKVxuICAgIH1cblxuICAgIGlmIChhZnRlcikgdGhpcy5idWlsZGVyKGFmdGVyKVxuICAgIHRoaXMuYnVpbGRlcignfScsIG5vZGUsICdlbmQnKVxuICB9XG5cbiAgcmF3IChub2RlLCBvd24sIGRldGVjdCkge1xuICAgIGxldCB2YWx1ZVxuICAgIGlmICghZGV0ZWN0KSBkZXRlY3QgPSBvd25cblxuICAgIC8vIEFscmVhZHkgaGFkXG4gICAgaWYgKG93bikge1xuICAgICAgdmFsdWUgPSBub2RlLnJhd3Nbb3duXVxuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ3VuZGVmaW5lZCcpIHJldHVybiB2YWx1ZVxuICAgIH1cblxuICAgIGxldCBwYXJlbnQgPSBub2RlLnBhcmVudFxuXG4gICAgLy8gSGFjayBmb3IgZmlyc3QgcnVsZSBpbiBDU1NcbiAgICBpZiAoZGV0ZWN0ID09PSAnYmVmb3JlJykge1xuICAgICAgaWYgKCFwYXJlbnQgfHwgKHBhcmVudC50eXBlID09PSAncm9vdCcgJiYgcGFyZW50LmZpcnN0ID09PSBub2RlKSkge1xuICAgICAgICByZXR1cm4gJydcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBGbG9hdGluZyBjaGlsZCB3aXRob3V0IHBhcmVudFxuICAgIGlmICghcGFyZW50KSByZXR1cm4gREVGQVVMVF9SQVdbZGV0ZWN0XVxuXG4gICAgLy8gRGV0ZWN0IHN0eWxlIGJ5IG90aGVyIG5vZGVzXG4gICAgbGV0IHJvb3QgPSBub2RlLnJvb3QoKVxuICAgIGlmICghcm9vdC5yYXdDYWNoZSkgcm9vdC5yYXdDYWNoZSA9IHsgfVxuICAgIGlmICh0eXBlb2Ygcm9vdC5yYXdDYWNoZVtkZXRlY3RdICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgcmV0dXJuIHJvb3QucmF3Q2FjaGVbZGV0ZWN0XVxuICAgIH1cblxuICAgIGlmIChkZXRlY3QgPT09ICdiZWZvcmUnIHx8IGRldGVjdCA9PT0gJ2FmdGVyJykge1xuICAgICAgcmV0dXJuIHRoaXMuYmVmb3JlQWZ0ZXIobm9kZSwgZGV0ZWN0KVxuICAgIH0gZWxzZSB7XG4gICAgICBsZXQgbWV0aG9kID0gJ3JhdycgKyBjYXBpdGFsaXplKGRldGVjdClcbiAgICAgIGlmICh0aGlzW21ldGhvZF0pIHtcbiAgICAgICAgdmFsdWUgPSB0aGlzW21ldGhvZF0ocm9vdCwgbm9kZSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJvb3Qud2FsayhpID0+IHtcbiAgICAgICAgICB2YWx1ZSA9IGkucmF3c1tvd25dXG4gICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ3VuZGVmaW5lZCcpIHJldHVybiBmYWxzZVxuICAgICAgICB9KVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICd1bmRlZmluZWQnKSB2YWx1ZSA9IERFRkFVTFRfUkFXW2RldGVjdF1cblxuICAgIHJvb3QucmF3Q2FjaGVbZGV0ZWN0XSA9IHZhbHVlXG4gICAgcmV0dXJuIHZhbHVlXG4gIH1cblxuICByYXdTZW1pY29sb24gKHJvb3QpIHtcbiAgICBsZXQgdmFsdWVcbiAgICByb290LndhbGsoaSA9PiB7XG4gICAgICBpZiAoaS5ub2RlcyAmJiBpLm5vZGVzLmxlbmd0aCAmJiBpLmxhc3QudHlwZSA9PT0gJ2RlY2wnKSB7XG4gICAgICAgIHZhbHVlID0gaS5yYXdzLnNlbWljb2xvblxuICAgICAgICBpZiAodHlwZW9mIHZhbHVlICE9PSAndW5kZWZpbmVkJykgcmV0dXJuIGZhbHNlXG4gICAgICB9XG4gICAgfSlcbiAgICByZXR1cm4gdmFsdWVcbiAgfVxuXG4gIHJhd0VtcHR5Qm9keSAocm9vdCkge1xuICAgIGxldCB2YWx1ZVxuICAgIHJvb3Qud2FsayhpID0+IHtcbiAgICAgIGlmIChpLm5vZGVzICYmIGkubm9kZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHZhbHVlID0gaS5yYXdzLmFmdGVyXG4gICAgICAgIGlmICh0eXBlb2YgdmFsdWUgIT09ICd1bmRlZmluZWQnKSByZXR1cm4gZmFsc2VcbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiB2YWx1ZVxuICB9XG5cbiAgcmF3SW5kZW50IChyb290KSB7XG4gICAgaWYgKHJvb3QucmF3cy5pbmRlbnQpIHJldHVybiByb290LnJhd3MuaW5kZW50XG4gICAgbGV0IHZhbHVlXG4gICAgcm9vdC53YWxrKGkgPT4ge1xuICAgICAgbGV0IHAgPSBpLnBhcmVudFxuICAgICAgaWYgKHAgJiYgcCAhPT0gcm9vdCAmJiBwLnBhcmVudCAmJiBwLnBhcmVudCA9PT0gcm9vdCkge1xuICAgICAgICBpZiAodHlwZW9mIGkucmF3cy5iZWZvcmUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgbGV0IHBhcnRzID0gaS5yYXdzLmJlZm9yZS5zcGxpdCgnXFxuJylcbiAgICAgICAgICB2YWx1ZSA9IHBhcnRzW3BhcnRzLmxlbmd0aCAtIDFdXG4gICAgICAgICAgdmFsdWUgPSB2YWx1ZS5yZXBsYWNlKC9bXlxcc10vZywgJycpXG4gICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiB2YWx1ZVxuICB9XG5cbiAgcmF3QmVmb3JlQ29tbWVudCAocm9vdCwgbm9kZSkge1xuICAgIGxldCB2YWx1ZVxuICAgIHJvb3Qud2Fsa0NvbW1lbnRzKGkgPT4ge1xuICAgICAgaWYgKHR5cGVvZiBpLnJhd3MuYmVmb3JlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICB2YWx1ZSA9IGkucmF3cy5iZWZvcmVcbiAgICAgICAgaWYgKHZhbHVlLmluZGV4T2YoJ1xcbicpICE9PSAtMSkge1xuICAgICAgICAgIHZhbHVlID0gdmFsdWUucmVwbGFjZSgvW15cXG5dKyQvLCAnJylcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgIH1cbiAgICB9KVxuICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICB2YWx1ZSA9IHRoaXMucmF3KG5vZGUsIG51bGwsICdiZWZvcmVEZWNsJylcbiAgICB9IGVsc2UgaWYgKHZhbHVlKSB7XG4gICAgICB2YWx1ZSA9IHZhbHVlLnJlcGxhY2UoL1teXFxzXS9nLCAnJylcbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlXG4gIH1cblxuICByYXdCZWZvcmVEZWNsIChyb290LCBub2RlKSB7XG4gICAgbGV0IHZhbHVlXG4gICAgcm9vdC53YWxrRGVjbHMoaSA9PiB7XG4gICAgICBpZiAodHlwZW9mIGkucmF3cy5iZWZvcmUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHZhbHVlID0gaS5yYXdzLmJlZm9yZVxuICAgICAgICBpZiAodmFsdWUuaW5kZXhPZignXFxuJykgIT09IC0xKSB7XG4gICAgICAgICAgdmFsdWUgPSB2YWx1ZS5yZXBsYWNlKC9bXlxcbl0rJC8sICcnKVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfVxuICAgIH0pXG4gICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHZhbHVlID0gdGhpcy5yYXcobm9kZSwgbnVsbCwgJ2JlZm9yZVJ1bGUnKVxuICAgIH0gZWxzZSBpZiAodmFsdWUpIHtcbiAgICAgIHZhbHVlID0gdmFsdWUucmVwbGFjZSgvW15cXHNdL2csICcnKVxuICAgIH1cbiAgICByZXR1cm4gdmFsdWVcbiAgfVxuXG4gIHJhd0JlZm9yZVJ1bGUgKHJvb3QpIHtcbiAgICBsZXQgdmFsdWVcbiAgICByb290LndhbGsoaSA9PiB7XG4gICAgICBpZiAoaS5ub2RlcyAmJiAoaS5wYXJlbnQgIT09IHJvb3QgfHwgcm9vdC5maXJzdCAhPT0gaSkpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBpLnJhd3MuYmVmb3JlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgIHZhbHVlID0gaS5yYXdzLmJlZm9yZVxuICAgICAgICAgIGlmICh2YWx1ZS5pbmRleE9mKCdcXG4nKSAhPT0gLTEpIHtcbiAgICAgICAgICAgIHZhbHVlID0gdmFsdWUucmVwbGFjZSgvW15cXG5dKyQvLCAnJylcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KVxuICAgIGlmICh2YWx1ZSkgdmFsdWUgPSB2YWx1ZS5yZXBsYWNlKC9bXlxcc10vZywgJycpXG4gICAgcmV0dXJuIHZhbHVlXG4gIH1cblxuICByYXdCZWZvcmVDbG9zZSAocm9vdCkge1xuICAgIGxldCB2YWx1ZVxuICAgIHJvb3Qud2FsayhpID0+IHtcbiAgICAgIGlmIChpLm5vZGVzICYmIGkubm9kZXMubGVuZ3RoID4gMCkge1xuICAgICAgICBpZiAodHlwZW9mIGkucmF3cy5hZnRlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICB2YWx1ZSA9IGkucmF3cy5hZnRlclxuICAgICAgICAgIGlmICh2YWx1ZS5pbmRleE9mKCdcXG4nKSAhPT0gLTEpIHtcbiAgICAgICAgICAgIHZhbHVlID0gdmFsdWUucmVwbGFjZSgvW15cXG5dKyQvLCAnJylcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KVxuICAgIGlmICh2YWx1ZSkgdmFsdWUgPSB2YWx1ZS5yZXBsYWNlKC9bXlxcc10vZywgJycpXG4gICAgcmV0dXJuIHZhbHVlXG4gIH1cblxuICByYXdCZWZvcmVPcGVuIChyb290KSB7XG4gICAgbGV0IHZhbHVlXG4gICAgcm9vdC53YWxrKGkgPT4ge1xuICAgICAgaWYgKGkudHlwZSAhPT0gJ2RlY2wnKSB7XG4gICAgICAgIHZhbHVlID0gaS5yYXdzLmJldHdlZW5cbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ3VuZGVmaW5lZCcpIHJldHVybiBmYWxzZVxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIHZhbHVlXG4gIH1cblxuICByYXdDb2xvbiAocm9vdCkge1xuICAgIGxldCB2YWx1ZVxuICAgIHJvb3Qud2Fsa0RlY2xzKGkgPT4ge1xuICAgICAgaWYgKHR5cGVvZiBpLnJhd3MuYmV0d2VlbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgdmFsdWUgPSBpLnJhd3MuYmV0d2Vlbi5yZXBsYWNlKC9bXlxcczpdL2csICcnKVxuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiB2YWx1ZVxuICB9XG5cbiAgYmVmb3JlQWZ0ZXIgKG5vZGUsIGRldGVjdCkge1xuICAgIGxldCB2YWx1ZVxuICAgIGlmIChub2RlLnR5cGUgPT09ICdkZWNsJykge1xuICAgICAgdmFsdWUgPSB0aGlzLnJhdyhub2RlLCBudWxsLCAnYmVmb3JlRGVjbCcpXG4gICAgfSBlbHNlIGlmIChub2RlLnR5cGUgPT09ICdjb21tZW50Jykge1xuICAgICAgdmFsdWUgPSB0aGlzLnJhdyhub2RlLCBudWxsLCAnYmVmb3JlQ29tbWVudCcpXG4gICAgfSBlbHNlIGlmIChkZXRlY3QgPT09ICdiZWZvcmUnKSB7XG4gICAgICB2YWx1ZSA9IHRoaXMucmF3KG5vZGUsIG51bGwsICdiZWZvcmVSdWxlJylcbiAgICB9IGVsc2Uge1xuICAgICAgdmFsdWUgPSB0aGlzLnJhdyhub2RlLCBudWxsLCAnYmVmb3JlQ2xvc2UnKVxuICAgIH1cblxuICAgIGxldCBidWYgPSBub2RlLnBhcmVudFxuICAgIGxldCBkZXB0aCA9IDBcbiAgICB3aGlsZSAoYnVmICYmIGJ1Zi50eXBlICE9PSAncm9vdCcpIHtcbiAgICAgIGRlcHRoICs9IDFcbiAgICAgIGJ1ZiA9IGJ1Zi5wYXJlbnRcbiAgICB9XG5cbiAgICBpZiAodmFsdWUuaW5kZXhPZignXFxuJykgIT09IC0xKSB7XG4gICAgICBsZXQgaW5kZW50ID0gdGhpcy5yYXcobm9kZSwgbnVsbCwgJ2luZGVudCcpXG4gICAgICBpZiAoaW5kZW50Lmxlbmd0aCkge1xuICAgICAgICBmb3IgKGxldCBzdGVwID0gMDsgc3RlcCA8IGRlcHRoOyBzdGVwKyspIHZhbHVlICs9IGluZGVudFxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB2YWx1ZVxuICB9XG5cbiAgcmF3VmFsdWUgKG5vZGUsIHByb3ApIHtcbiAgICBsZXQgdmFsdWUgPSBub2RlW3Byb3BdXG4gICAgbGV0IHJhdyA9IG5vZGUucmF3c1twcm9wXVxuICAgIGlmIChyYXcgJiYgcmF3LnZhbHVlID09PSB2YWx1ZSkge1xuICAgICAgcmV0dXJuIHJhdy5yYXdcbiAgICB9XG5cbiAgICByZXR1cm4gdmFsdWVcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBTdHJpbmdpZmllclxuIl0sImZpbGUiOiJzdHJpbmdpZmllci5qcyJ9
