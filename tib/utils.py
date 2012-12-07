import os
from django.conf import settings
import lexrestclient as lex
import lxml
import math
import time

class ResourceError(Exception):
    """
    Exception thrown when there is a problem with fetching a Leximancer resource.

    Attributes:
        msg -- explanation of the error.
    """
    def __init__(self, msg):
        self.msg = msg

    def __str__(self):
        return repr(self.msg)

# Map a leximancer stage to a numerical status number
STATUS_MAP = {
    'PREPROCESS': 11,
    'TEXTSTATS': 22,
    'REMOVE_LOW_FREQ': 33,
    'INDEX': 44,
    'FINDSEEDS': 55,
    'LEARN': 66,
    'CLASSIFY': 78,
    'CLUSTER': 90,
}

def get_project_folder():
    """
    Get the project folder with he name specified in the PROJECT_FOLDER setting.

    Returns the lex object (as returned by lexrestclient) representing the project folder.
    """
    start = lex.LexObject.from_url(settings.LEX_URL, auth=settings.LEX_AUTH)

    if isinstance(start, lex.Instance):
        top_folder = None
        for pf in start.project_folder:
            folder = lex.LexObject.from_url(pf.href, auth=settings.LEX_AUTH)
            if folder.name == settings.TOP_PROJECT_FOLDER:
                top_folder = folder
                break

        user_folder = None
        if top_folder is not None:
            for f in top_folder.project_folder:
                uf = lex.LexObject.from_url(f.href, auth=settings.LEX_AUTH)
                if uf.name == settings.LEX_AUTH[0]:
                    user_folder = uf
                    break
        else:
            raise ResourceError('Couldn\'t find the top level project folder "{0}".'.format(settings.TOP_PROJECT_FOLDER))

        if user_folder is None:
            raise ResourceError('Couldn\'t find the user project folder "{0}".'.format(settings.LEX_AUTH[0]))

        return user_folder

def get_data_folder():
    """
    Get the data folder with he name specified in the DATA_FOLDER setting.

    Returns the lex object (as returned by lexrestclient) representing the data folder.
    """
    start = lex.LexObject.from_url(settings.LEX_URL, auth=settings.LEX_AUTH)

    if isinstance(start, lex.Instance):
        top_folder = None
        for df in start.data_folder:
            folder = lex.LexObject.from_url(df.href, auth=settings.LEX_AUTH)
            if folder.name == settings.TOP_DATA_FOLDER:
                top_folder = folder
                break

        if top_folder is not None:
            for f in top_folder.data_folder:
                if f.name == settings.DATA_FOLDER:
                    return f
        else:
            raise ResourceError('Couldn\'t find the top level data folder "{0}".'.format(settings.TOP_DATA_FOLDER))
        raise ResourceError('Couldn\'t  find the data folder "{0}".'.format(settings.DATA_FOLDER))

def create_lex_project(name, doc, mimetype=None):
    """
    Create a project with the passed name and start it running.

    Return the created project.
    """
    project_folder = get_project_folder()
    data_folder = get_data_folder()
    lex_project = project_folder.create_project(name, auth=settings.LEX_AUTH)

    # Set some settings
    conf_href = '{0}{1}'.format(lex_project.href, '_/project-configuration')
    lex.rest.rest_invoke(conf_href, method="POST", auth=settings.LEX_AUTH, headers={"Content-Type": "text/xml", "X-HTTP-Method-Override": "PUT"}, body=settings.PROJECT_CONF_XML)

    # Select the data
    docset = lex_project.docset[0]
    df = lex.LexObject.from_url(u'{0}/{1}'.format(data_folder.href, doc), auth=settings.LEX_AUTH)
    docset.create_file(doc, df, auth=settings.LEX_AUTH, mimetype=mimetype)
    run_project(lex_project.project_status[0])

    return lex_project

def run_project(status):
    """
    Run the project using the passed status object.
    """
    stage = status.stage.get('name')
    state = status.stage.get('state')
    if state.lower() == 'next' and stage.lower() <> 'map':
        status.set_updatable_attrs('{0}:{1}'.format(stage, 'MAP'), 'active')
        status.syncronize(auth=settings.LEX_AUTH)
    return lex.project.ProjectStatus.from_url(status.href, auth=settings.LEX_AUTH)

def get_project_status(url):
    """
    Get the project status for the for the project at the passed URL.
    """
    try:
        project = lex.LexObject.from_url(url, auth=settings.LEX_AUTH)
        status = project.project_status[0]
        return status.stage.get("name"), status.stage.get('state'), status.message, project.href
    except StandardError:
        raise ResourceError('Couldn\'t fetch project using the URL {0}'.format(url))

def get_markers(markers_url, cookie):
    """
    Get the markers for the project at URL.
    """
    resp, content = lex.rest.rest_invoke(markers_url , auth=settings.LEX_AUTH, headers={'Cookie':cookie})
    if resp.status == 200:
        return content

def delete_project(url):
    """
    Delete project at URL. Also delete the file.
    """
    project = lex.LexObject.from_url(url, auth=settings.LEX_AUTH)
    text_path = os.path.join(settings.TEXT_PATH, "{0}.txt".format(project.name))
    if os.path.exists(text_path):
        os.remove(text_path)
    lex.rest_invoke(url, method='DELETE', auth=settings.LEX_AUTH)

def get_concepts(markers_xml):
    """
    Convert the markers XML file to JSON.
    """
    num_blocks = None
    entities = {}
    themes = {}
    prominence = []
    markers = lxml.etree.fromstring(markers_xml)

    for marker in markers:
        if marker.tag == 'markers':
            num_blocks = marker.attrib['cbcount']
            for entity in marker:
                entities[int(entity.attrib['id'])] = {
                    'id': int(entity.attrib['id']),
                    'weight': float(entity.attrib['ctv']),
                    'frequency': int(entity.attrib['freq']),
                    'mstEdges': [],
                    'value': entity.attrib['value'],
                    'kind': entity.attrib['kind'],
                    'themeId': entity.attrib['tid'],
                    'x': float(entity.attrib['x']),
                    'y': float(entity.attrib['y'])
                }
                for rels in entity:
                    related = []
                    for rel in rels:
                        related.append({
                            'id': rel.attrib['id'],
                            'strength': rel.attrib['str'],
                            'count': rel.attrib['ct'],
                            'prom': rel.attrib['pr']
                        })
                    entities[int(entity.attrib['id'])]['related'] = related
        if marker.tag == 'themes':
            for theme in marker:
                themes[int(theme.attrib['index'])] = {'id': int(theme.attrib['index']), 'name': theme.attrib['name'], 'hue': theme.attrib['hue'], "connectivity": theme.attrib['connectiv']}
        if marker.tag == 'mst':
            for node in marker:
                for edge in node[0]:
                    entities[int(node.attrib['id'])]['mstEdges'].append({'to': int(edge.attrib['id'])})
        if marker.tag == 'prominence':
            for node in marker[0]:
                if node.tag == 'edge':
                    prominence.append({'from': int(node.attrib['from']), 'to': int(node.attrib['to']), 'weight': float(node.attrib['w'])})
    return entities, themes, prominence, num_blocks

def update_map(project_url):
    """
    Update map resource.
    
    """
    name = '@map1'
    copy_url = project_url + '_/cluster/markersets/default/copy'
    
    
    resp, content = lex.rest.rest_invoke(copy_url , auth=settings.LEX_AUTH,  method="POST", params={'name' : name})
    map_url = resp['location']    
    cookie = resp['set-cookie']
    
    # Set theme size
    lex.rest.rest_invoke(map_url + '/cluster' , auth=settings.LEX_AUTH,  method="POST", headers={'Cookie':cookie}, params={'themeonly' : True, 'themesize' : settings.PROJECT_THEME_SIZE})
    
    return (map_url + '/map', cookie)