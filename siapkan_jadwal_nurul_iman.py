#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Data jadwal kajian Masjid Nurul Iman (Blok M Square)
Periode 05 - 11 Oktober 2026. Sumber: @masjidnuruliman
Struktur MENGIKUTI PERSIS form isi kajian di infokajian.app:
  {id,title,topic,speaker_id,mosque_id,date,time,status,description,source,submitted_by}
"""
import json

MOSQUE_ID = "m1773644943526"   # Masjid Nurul Iman (Blok M Square) - sudah ada di katalog
SOURCE    = "@masjidnuruliman"
SUBMITTER = "u3"                # akun admin (Syahlan Jailani)
STATUS    = "approved"          # langsung tampil

# Speaker yang SUDAH ada di katalog (jangan buat duplikat)
SPEAKER_SUDAH_ADA = {
    "Ustadz Muhammad Nuzul Dzikri":     "s1773670241268",
    "Ustadz Mohamad Nursamsul Qomar":   "s1773841380041",
    "Ustadz Khalid Basalamah":          "s4",
}

# (tanggal, jam, nama_ustadz, tema)
JADWAL = [
    # SENIN 05
    ("2026-10-05", "15.15", "Ustadz DR. Elfa Hendri Mukhlis, MA",        "Tafsir Ibnu Katsir"),
    ("2026-10-05", "18.15", "Ustadz DR. Syafiq Al-Khatieb, Lc., MA",     "Kitab Talbis Iblis"),
    # SELASA 06
    ("2026-10-06", "15.15", "Ustadz Abu Hurairah, M.A",                  "At Tazkirah"),
    ("2026-10-06", "18.15", "Ustadz Fatahillah Aly, S.Ag",               "Kajian Kitab"),
    # RABU 07  (3 sesi)
    ("2026-10-07", "12.30", "Ustadz Yovin Abu Hammam",                   "Kajian Kitab"),
    ("2026-10-07", "15.15", "Ustadz Idrus Yusuf, MA",                    "Riyadush Shalihin"),
    ("2026-10-07", "18.15", "Ustadz Khalid Basalamah",                   "Dosa-Dosa Besar"),
    # KAMIS 08 (3 sesi)
    ("2026-10-08", "12.30", "Ustadz Ahmad Zainuddin Al Banjari, Lc., MA","Kajian Kitab"),
    ("2026-10-08", "15.15", "Ustadz DR. Nurdin Apud Sarbini, Lc., M.Pd", "Fiqih Dzikir dan Do'a"),
    ("2026-10-08", "18.15", "Ustadz Imam Syuhada, Lc",                   "Kajian Ilmiah"),
    # JUM'AT 09
    ("2026-10-09", "11.45", "Ustadz DR. Cecep Rahmat, M.Ag",             "Khutbah Jum'at"),
    ("2026-10-09", "18.15", "Ustadz Masykur Abu Mawaddah",               "Kajian Kitab"),
    # SABTU 10 (3 sesi)
    ("2026-10-10", "07.00", "Ustadz Muhammad Nuzul Dzikri",              "Tadzkiratus Saami"),
    ("2026-10-10", "10.00", "Ustadz Mohamad Nursamsul Qomar, Lc",        "Kajian Kitab"),
    ("2026-10-10", "13.00", "Ustadz Khalid Basalamah",                   "Sirah Nabawiyah/Sahabat"),
    # AHAD 11 (4 sesi)
    ("2026-10-11", "08.30", "Ustadz Kak Yogi Kusprayogi, M. PSi",        "Kajian Psikologi"),
    ("2026-10-11", "12.30", "Ustadz Prof. DR. Ali Musri Semjan Putra, Lc., MA", "Kajian Ilmiah"),
    ("2026-10-11", "15.15", "Ustadz Najmi Umar Bakkar",                  "Kajian Kitab"),
    ("2026-10-11", "18.15", "Ustadz Hamdi Solah Al-Bakry, Lc",           "Kajian Ilmiah"),
]

def norm(n):
    """Nama dinormalisasi seperti pola aplikasi (lowercase, trim)."""
    return n.strip().lower()

def main():
    # 1) Kumpulkan speaker unik
    speaker_map = {}
    for i, (_, _, nama, _) in enumerate(JADWAL):
        key = norm(nama)
        if key in speaker_map:
            continue
        if nama in SPEAKER_SUDAH_ADA:
            speaker_map[key] = {"id": SPEAKER_SUDAH_ADA[nama], "baru": False, "nama": nama}
        else:
            speaker_map[key] = {"id": "s%d" % (1781000000000 + 777000 + i), "baru": True, "nama": nama}

    # 2) Bangun dokumen kajian
    kajian = []
    for i, (tgl, jam, nama, tema) in enumerate(JADWAL):
        spk = speaker_map[norm(nama)]
        kajian.append({
            "id": "k%d" % (1781000000000 + 50000 + i),
            "title": "Kajian %s - %s" % (tema, spk["nama"]),
            "topic": tema,
            "speaker_id": spk["id"],
            "mosque_id": MOSQUE_ID,
            "date": tgl,
            "time": jam,
            "status": STATUS,
            "description": "Kajian rutin di Masjid Nurul Iman (Blok M Square). Sumber: %s" % SOURCE,
            "source": SOURCE,
            "submitted_by": SUBMITTER,
        })

    # 3) Bangun dokumen speaker baru
    speakers_baru = []
    for key, s in speaker_map.items():
        if not s["baru"]:
            continue
        speakers_baru.append({
            "id": s["id"],
            "full_name": s["nama"],
            "normalized_name": key,
            "verified": True,
            "created_by": SUBMITTER,
        })

    out = {"kajian": kajian, "speakers_baru": speakers_baru, "source": SOURCE, "mosque_id": MOSQUE_ID}
    with open("/opt/data/work/infokajian/jadwal_nurul_iman.json", "w") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    print("Kajian siap     :", len(kajian))
    print("Speaker sudah ada:", sum(1 for s in speaker_map.values() if not s["baru"]))
    print("Speaker baru    :", len(speakers_baru))
    for s in speakers_baru:
        print("   +", s["full_name"])

if __name__ == "__main__":
    main()
