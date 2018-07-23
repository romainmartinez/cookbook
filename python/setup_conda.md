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

- (*optional*) install jupyterlab

```bash
sudo apt install npm
conda install -c conda-forge jupyterlab
jupyter labextension install jupyterlab-toc
jupyter labextension install @jupyterlab/plotly-extension
```
- (*optional*) install jupyter notebook (caution, this add 1.2GB)

```bash
conda install -c conda-forge jupyter jupyter_contrib_nbextensions yapf
```
  Then, activate the following extensions:`Code prettify`, `Runtools`, `Table of Contents (2)`

- (*optional*) Use a conda env in jupyter
```bash
cd ENV
conda env create -f env.yml
source activate ENV
python -m ipykernel install --user --name ENV
```
