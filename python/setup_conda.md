# Setup a fresh Conda

## 1. Clean previous version
- Uninstalling  Miniconda:
```bash
rm -rf ~/miniconda* ~/.condarc ~/.conda ~/.continuum
```
- Uninstalling Pycharm: from the Ubuntu Software

## 2. Install Miniconda

```bash
wget https://repo.continuum.io/miniconda/\
Miniconda3-latest-Linux-x86_64.sh
bash Miniconda3-latest-Linux-x86_64.sh
rm Miniconda3-latest-Linux-x86_64.sh
```

## 3. (*optional*) Install Jupyter

- Option 1: jupyterlab

```bash
sudo apt install npm
conda install -y jupyterlab
pip install jupyterlab_code_formatter black
jupyter labextension install @ryantam626/jupyterlab_code_formatter
jupyter serverextension enable --py jupyterlab_code_formatter
jupyter labextension install @jupyterlab/toc
```

Keyboard config:
```
{
    "notebook:run-all-above": {
        "command": "notebook:run-all-above",
            "keys": [
                "Alt A"
            ],
                "selector": ".jp-Notebook:focus"
    },
    
    "jupyterlab_black:format":{
        "command": "jupyterlab_black:format",
            "keys": [
                "Ctrl L"
            ],
                "selector": ".jp-Notebook.jp-mod-editMode"
    }
}
```

- Option 2: jupyter notebook

```bash
conda install jupyter
conda install -c conda-forge jupyter_contrib_nbextensions yapf jupyterthemes # optional
jt -t grade3 -fs 95  -tfs 13 -nfs 115 -cellw 88% -T -nf opensans -tf loraserif # optional
```
  Then, activate the following extensions:`Code prettify`, `Runtools`, `Table of Contents (2)`

Use a conda env in jupyter with:
```bash
cd ENV
conda env create -f env.yml
source activate ENV
python -m ipykernel install --user --name ENV
```
